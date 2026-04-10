import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingInterval, SubscriptionStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { CommunicationsService } from '../modules/communications/communications.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly platformFeePercent: number;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly communicationsService: CommunicationsService,
  ) {
    const secretKey = this.config.get<string>('stripe.secretKey');
    if (!secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2022-11-15',
    });
    this.platformFeePercent = Number(this.config.get<number>('stripe.platformFeePercentage') ?? 2);
  }

  private get webUrl() {
    return this.config.get<string>('app.webUrl') ?? 'http://localhost:3000';
  }

  private get stripeWebhookSecret() {
    return this.config.get<string>('stripe.webhookSecret');
  }

  private get connectWebhookSecret() {
    return this.config.get<string>('stripe.connectWebhookSecret');
  }

  private async getTenant(tenantId: string) {
    const tenant = await this.db.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });
    if (!tenant) throw new Error('Tenant not found');
    return tenant;
  }

  private async getConnectIntegration(tenantId: string) {
    return this.db.tenantIntegration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'stripe-connect' } },
    });
  }

  private async findPlanForPrice(price: Stripe.Price) {
    if (!price.unit_amount || !price.recurring) return null;
    const interval = price.recurring.interval === 'year' ? 'ANNUAL' : 'MONTHLY';
    const match = await this.db.plan.findFirst({
      where: {
        OR: [
          {
            monthlyPriceCents: price.unit_amount,
            slug: 'STARTER',
          },
          {
            annualPriceCents: price.unit_amount,
            slug: 'STARTER',
          },
          {
            monthlyPriceCents: price.unit_amount,
            slug: 'GROWTH',
          },
          {
            annualPriceCents: price.unit_amount,
            slug: 'GROWTH',
          },
          {
            monthlyPriceCents: price.unit_amount,
            slug: 'PRO',
          },
          {
            annualPriceCents: price.unit_amount,
            slug: 'PRO',
          },
          {
            monthlyPriceCents: price.unit_amount,
            slug: 'ENTERPRISE',
          },
          {
            annualPriceCents: price.unit_amount,
            slug: 'ENTERPRISE',
          },
        ],
      },
    });
    return match;
  }

  private normalizeSubscriptionStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'active':
        return 'ACTIVE';
      case 'trialing':
        return 'TRIALING';
      case 'incomplete':
        return 'INCOMPLETE';
      case 'past_due':
        return 'PAST_DUE';
      default:
        return 'CANCELED';
    }
  }

  private normalizeBillingInterval(interval: string): BillingInterval {
    return interval === 'year' ? 'ANNUAL' : 'MONTHLY';
  }

  private async ensureSaaSCustomer(tenant: { id: string; name: string }, stripeCustomerId?: string | null) {
    if (stripeCustomerId) {
      return stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      name: tenant.name,
      metadata: { tenantId: tenant.id },
    });

    await this.db.tenantSubscription.updateMany({
      where: { tenantId: tenant.id },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  async createSaaSCustomer(tenantId: string) {
    const tenant = await this.getTenant(tenantId);
    const stripeCustomer = await this.stripe.customers.create({
      name: tenant.name,
      metadata: { tenantId: tenant.id, slug: tenant.slug },
    });

    if (tenant.subscription) {
      await this.db.tenantSubscription.update({
        where: { tenantId: tenant.id },
        data: { stripeCustomerId: stripeCustomer.id },
      });
    }

    return stripeCustomer;
  }

  async createSaaSSubscription(tenantId: string, planPriceId: string) {
    const tenant = await this.getTenant(tenantId);
    const subscription = tenant.subscription;
    const customerId = await this.ensureSaaSCustomer(tenant, subscription?.stripeCustomerId);
    const price = await this.stripe.prices.retrieve(planPriceId);
    if (!price || !price.recurring || !price.unit_amount) {
      throw new Error('Stripe price must be a recurring plan');
    }

    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: planPriceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: { tenantId },
    });

    const plan = (await this.findPlanForPrice(price)) ??
      (await this.db.plan.findFirst({ where: { isActive: true }, orderBy: { monthlyPriceCents: 'asc' } }));

    const payload = {
      tenantId,
      planId: plan?.id ?? '',
      status: this.normalizeSubscriptionStatus(stripeSubscription.status),
      billingInterval: this.normalizeBillingInterval(price.recurring.interval),
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customerId,
    };

    const updated = await this.db.tenantSubscription.upsert({
      where: { tenantId },
      create: payload,
      update: payload,
    });

    await this.communicationsService.sendEmail({
      subject: 'Welcome to OrgFlow Billing',
      body: `Your subscription has been created successfully for tenant ${tenant.name}.`,
    }, tenantId);

    return updated;
  }

  async updateSaaSSubscription(tenantId: string, newPlanPriceId: string) {
    const tenant = await this.getTenant(tenantId);
    const subscription = tenant.subscription;
    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No SaaS subscription found for tenant');
    }

    const price = await this.stripe.prices.retrieve(newPlanPriceId);
    if (!price || !price.recurring || !price.unit_amount) {
      throw new Error('Stripe price must be a recurring plan');
    }

    const currentSubscription = await this.stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const itemId = currentSubscription.items?.data?.[0]?.id;
    const stripeSubscription = await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      proration_behavior: 'create_prorations',
      items: itemId ? [{ id: itemId, price: newPlanPriceId }] : [{ price: newPlanPriceId }],
    });

    const plan = await this.findPlanForPrice(price);
    const updateData = {
      planId: plan?.id ?? subscription.planId,
      status: this.normalizeSubscriptionStatus(stripeSubscription.status),
      billingInterval: this.normalizeBillingInterval(price.recurring.interval),
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
    };

    return this.db.tenantSubscription.update({ where: { tenantId }, data: updateData });
  }

  async cancelSaaSSubscription(tenantId: string, immediately: boolean) {
    const tenant = await this.getTenant(tenantId);
    const subscription = tenant.subscription;
    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No SaaS subscription found for tenant');
    }

    if (immediately) {
      await this.stripe.subscriptions.del(subscription.stripeSubscriptionId);
      await this.db.tenantSubscription.update({
        where: { tenantId },
        data: { status: 'CANCELED', cancelAtPeriodEnd: false },
      });
      await this.db.tenant.update({ where: { id: tenant.id }, data: { isActive: false } });
      return { canceled: true };
    }

    const stripeSubscription = await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    return this.db.tenantSubscription.update({
      where: { tenantId },
      data: {
        status: this.normalizeSubscriptionStatus(stripeSubscription.status),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? true,
      },
    });
  }

  async getSaaSPortalUrl(tenantId: string) {
    const tenant = await this.getTenant(tenantId);
    const subscription = tenant.subscription;
    if (!subscription?.stripeCustomerId) {
      throw new Error('Tenant has no Stripe customer');
    }

    const portal = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: this.webUrl,
    });
    return portal;
  }

  async handleSaaSWebhook(payload: Buffer, signature: string) {
    const secret = this.stripeWebhookSecret;
    if (!secret) {
      throw new Error('Missing Stripe webhook secret');
    }
    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);

    this.logger.log(`Received SaaS webhook: ${event.type}`);

    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        const subscriptionRecord = await this.db.tenantSubscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!subscriptionRecord) break;
        await this.db.tenantSubscription.update({
          where: { tenantId: subscriptionRecord.tenantId },
          data: { status: 'ACTIVE' },
        });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        const subscriptionRecord = await this.db.tenantSubscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!subscriptionRecord) break;
        await this.db.tenantSubscription.update({
          where: { tenantId: subscriptionRecord.tenantId },
          data: { status: 'PAST_DUE' },
        });
        await this.communicationsService.sendEmail({
          subject: 'Payment failed',
          body: 'Your SaaS subscription payment failed. Please update your payment method.',
        }, subscriptionRecord.tenantId);
        break;
      }
      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const record = await this.db.tenantSubscription.findFirst({
          where: { stripeSubscriptionId: stripeSubscription.id },
        });
        if (!record) break;
        await this.db.tenantSubscription.update({
          where: { tenantId: record.tenantId },
          data: { status: 'CANCELED', cancelAtPeriodEnd: false },
        });
        await this.db.tenant.update({ where: { id: record.tenantId }, data: { isActive: false } });
        break;
      }
      case 'customer.subscription.updated': {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const record = await this.db.tenantSubscription.findFirst({
          where: { stripeSubscriptionId: stripeSubscription.id },
        });
        if (!record) break;
        await this.db.tenantSubscription.update({
          where: { tenantId: record.tenantId },
          data: {
            status: this.normalizeSubscriptionStatus(stripeSubscription.status),
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
          },
        });
        break;
      }
    }

    return { received: true };
  }

  async createConnectedAccount(tenantId: string) {
    const tenant = await this.getTenant(tenantId);
    const existingIntegration = await this.getConnectIntegration(tenantId);

    if (existingIntegration?.accountId) {
      return { accountId: existingIntegration.accountId };
    }

    const account = await this.stripe.accounts.create({
      type: 'express',
      country: tenant.countryCode ?? 'US',
      business_type: 'company',
      company: {
        name: tenant.name,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { tenantId },
    });

    await this.db.tenantIntegration.upsert({
      where: { tenantId_provider: { tenantId, provider: 'stripe-connect' } },
      create: {
        tenantId,
        provider: 'stripe-connect',
        accountId: account.id,
        isActive: false,
      },
      update: {
        accountId: account.id,
        isActive: false,
      },
    });

    return { accountId: account.id };
  }

  async getConnectOnboardingUrl(tenantId: string) {
    const integration = await this.getConnectIntegration(tenantId);
    const created = integration?.accountId
      ? { accountId: integration.accountId }
      : await this.createConnectedAccount(tenantId);

    const link = await this.stripe.accountLinks.create({
      account: created.accountId,
      refresh_url: `${this.webUrl}/dashboard/settings/billing`,
      return_url: `${this.webUrl}/dashboard/settings/billing`,
      type: 'account_onboarding',
    });
    return link;
  }

  async getConnectAccountStatus(tenantId: string) {
    const integration = await this.getConnectIntegration(tenantId);
    if (!integration?.accountId) {
      return {
        isConnected: false,
        accountId: null,
        payoutsEnabled: false,
        chargesEnabled: false,
        dashboardUrl: null,
      };
    }

    const account = await this.stripe.accounts.retrieve(integration.accountId);
    const isConnected = account.charges_enabled === true && account.payouts_enabled === true;
    return {
      isConnected,
      accountId: integration.accountId,
      payoutsEnabled: account.payouts_enabled === true,
      chargesEnabled: account.charges_enabled === true,
      dashboardUrl: `https://dashboard.stripe.com/${account.country?.toLowerCase() ?? 'us'}/express/${integration.accountId}`,
    };
  }

  private buildMembershipLineItem(tier: { name: string; monthlyPriceCents: number; annualPriceCents: number }, billingInterval: 'MONTHLY' | 'ANNUAL') {
    const amount = billingInterval === 'ANNUAL' ? tier.annualPriceCents : tier.monthlyPriceCents;
    return {
      price_data: {
        currency: 'usd',
        product: { name: `${tier.name} membership` },
        unit_amount: amount,
        recurring: billingInterval === 'ANNUAL' ? { interval: 'year' } : { interval: 'month' },
      },
      quantity: 1,
    };
  }

  async createMembershipCheckout(tenantId: string, memberId: string, tierId: string, billingInterval: 'MONTHLY' | 'ANNUAL' = 'MONTHLY') {
    const tenant = await this.getTenant(tenantId);
    const tier = await this.db.membershipTier.findFirst({ where: { id: tierId, tenantId } });
    if (!tier) throw new Error('Membership tier not found');
    const member = await this.db.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) throw new Error('Member not found');

    const connect = await this.getConnectIntegration(tenantId);
    if (!connect?.accountId) {
      throw new Error('Stripe Connect account is not configured for this organization');
    }

    const isRecurring = tier.monthlyPriceCents > 0 || tier.annualPriceCents > 0;
    const amount = billingInterval === 'ANNUAL' ? tier.annualPriceCents : tier.monthlyPriceCents;
    const lineItem = this.buildMembershipLineItem(tier, billingInterval);
    const applicationFee = Math.ceil((amount * this.platformFeePercent) / 100);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isRecurring ? 'subscription' : 'payment',
      customer_email: member.email,
      line_items: [lineItem as unknown as Stripe.Checkout.SessionCreateParams.LineItem],
      success_url: `${this.webUrl}/portal/membership?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.webUrl}/portal/membership`,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination: connect.accountId },
      },
      subscription_data: isRecurring ? { transfer_data: { destination: connect.accountId } } : undefined,
      metadata: {
        tenantId,
        memberId,
        tierId,
        type: 'membership',
      },
    });

    return { url: session.url, sessionId: session.id };
  }

  async createMembershipSubscription(tenantId: string, memberId: string, tierId: string, billingInterval: 'MONTHLY' | 'ANNUAL' = 'MONTHLY') {
    const tier = await this.db.membershipTier.findFirst({ where: { id: tierId, tenantId } });
    if (!tier) throw new Error('Membership tier not found');
    const member = await this.db.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) throw new Error('Member not found');
    const connect = await this.getConnectIntegration(tenantId);
    if (!connect?.accountId) throw new Error('Stripe Connect account is not configured');

    const price = billingInterval === 'ANNUAL' ? tier.annualPriceCents : tier.monthlyPriceCents;
    const stripeSubscription = await this.stripe.subscriptions.create({
      customer_email: member.email,
      items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${tier.name} membership` },
            unit_amount: price,
            recurring: billingInterval === 'ANNUAL' ? { interval: 'year' } : { interval: 'month' },
          } as any,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { payment_method_types: ['card'] },
      subscription_data: { transfer_data: { destination: connect.accountId } },
      metadata: { tenantId, memberId, tierId, type: 'membership' },
    } as any);

    const created = await this.db.membershipSubscription.create({
      data: {
        tenantId,
        memberId,
        tierId,
        status: 'ACTIVE',
        billingInterval,
        startedAt: new Date(),
        renewsAt: new Date(stripeSubscription.current_period_end * 1000),
        stripeSubscriptionId: stripeSubscription.id,
      },
    });

    return created;
  }

  async cancelMembershipSubscription(tenantId: string, memberId: string) {
    const subscription = await this.db.membershipSubscription.findFirst({
      where: { tenantId, memberId, status: 'ACTIVE' },
    });
    if (!subscription?.stripeSubscriptionId) throw new Error('No active membership subscription found');

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return this.db.membershipSubscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
  }

  async createEventCheckout(tenantId: string, eventId: string, tickets: Array<{ ticketId: string; quantity: number }>, memberId: string) {
    const member = await this.db.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) throw new Error('Member not found');
    const connect = await this.getConnectIntegration(tenantId);
    if (!connect?.accountId) throw new Error('Stripe Connect account is not configured');

    const lineItems = await Promise.all(tickets.map(async (ticket) => {
      const found = await this.db.eventTicket.findFirst({ where: { id: ticket.ticketId, event: { tenantId } } });
      if (!found) throw new Error(`Ticket ${ticket.ticketId} not found`);
      return {
        price_data: {
          currency: 'usd',
          product_data: { name: found.name },
          unit_amount: found.priceCents,
        },
        quantity: ticket.quantity,
      };
    }));

    const totalAmount = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount ?? 0) * item.quantity, 0);
    const applicationFee = Math.ceil((totalAmount * this.platformFeePercent) / 100);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: member.email,
      line_items: lineItems as Stripe.Checkout.SessionCreateParams.LineItem[],
      success_url: `${this.webUrl}/portal/events/${eventId}?success=1`,
      cancel_url: `${this.webUrl}/portal/events/${eventId}?canceled=1`,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination: connect.accountId },
      },
      metadata: {
        tenantId,
        memberId,
        eventId,
        type: 'event',
      },
    });

    return { url: session.url, sessionId: session.id };
  }

  async handleConnectWebhook(payload: Buffer, signature: string) {
    const secret = this.connectWebhookSecret;
    if (!secret) {
      throw new Error('Missing Stripe Connect webhook secret');
    }
    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    this.logger.log(`Received Connect webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.db.payment.updateMany({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: { status: 'SUCCEEDED', paidAt: new Date() },
        });
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.db.payment.updateMany({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: { status: 'FAILED', failedAt: new Date() },
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const record = await this.db.membershipSubscription.findFirst({ where: { stripeSubscriptionId: subscription.id } });
        if (record) {
          await this.db.membershipSubscription.update({
            where: { id: record.id },
            data: { status: 'EXPIRED', endsAt: new Date() },
          });
        }
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = typeof session.metadata === 'object' && session.metadata ? session.metadata : {};
        const tenantIdFromMetadata = metadata.tenantId as string | undefined;

        if (metadata.type === 'membership' && tenantIdFromMetadata && session.subscription) {
          const member = await this.db.member.findUnique({ where: { id: metadata.memberId as string } });
          const tier = await this.db.membershipTier.findUnique({ where: { id: metadata.tierId as string } });
          if (member && tier) {
            await this.db.membershipSubscription.create({
              data: {
                tenantId: tenantIdFromMetadata,
                memberId: member.id,
                tierId: tier.id,
                status: 'ACTIVE',
                billingInterval: typeof session.subscription !== 'string' && session.subscription?.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'ANNUAL' : 'MONTHLY',
                startedAt: new Date(),
                renewsAt: new Date(),
                stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
              },
            });
          }
        }

        if (metadata.type === 'event' && session.payment_intent && tenantIdFromMetadata) {
          await this.db.payment.create({
            data: {
              tenantId: tenantIdFromMetadata,
              memberId: metadata.memberId as string,
              amountCents: session.amount_total ?? 0,
              currency: session.currency?.toUpperCase() ?? 'USD',
              status: 'SUCCEEDED',
              stripePaymentIntentId: session.payment_intent as string,
              description: `Event registration ${metadata.eventId ?? ''}`,
              paidAt: new Date(),
              metadata,
            },
          });
        }
        break;
      }
    }

    return { received: true };
  }

  async processRefund(tenantId: string, paymentId: string, amountCents?: number, reason?: string) {
    const payment = await this.db.payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!payment?.stripePaymentIntentId) {
      throw new Error('Payment not found or missing Stripe intent');
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: payment.stripePaymentIntentId,
      amount: amountCents ?? undefined,
    };
    if (reason && ['duplicate', 'fraudulent', 'requested_by_customer'].includes(reason)) {
      refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
    }
    const refund = await this.stripe.refunds.create(refundParams);

    await this.db.refund.create({
      data: {
        tenantId,
        paymentId,
        amountCents: amountCents ?? payment.amountCents,
        reason: reason ?? 'Refund processed',
        stripeRefundId: refund.id,
        refundedAt: new Date(),
      },
    });

    await this.db.payment.update({
      where: { id: paymentId },
      data: {
        status: amountCents && amountCents < payment.amountCents ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
      },
    });

    return refund;
  }

  async getPayoutSchedule(tenantId: string) {
    const integration = await this.getConnectIntegration(tenantId);
    if (!integration?.accountId) throw new Error('Stripe Connect account not configured');
    const account = await this.stripe.accounts.retrieve(integration.accountId);
    return {
      payoutsEnabled: account.payouts_enabled,
      interval: account.settings?.payouts?.schedule?.interval ?? 'manual',
      delayDays: account.settings?.payouts?.schedule?.delay_days ?? null,
    };
  }

  async getRevenueReport(tenantId: string, fromDate: string, toDate: string) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const payments = await this.db.payment.findMany({
      where: {
        tenantId,
        status: 'SUCCEEDED',
        paidAt: { gte: from, lte: to },
      },
      orderBy: { paidAt: 'asc' },
    });

    const total = payments.reduce((sum: number, p: { amountCents: number }) => sum + p.amountCents, 0);
    const uniqueMonths = new Map<string, number>();
    payments.forEach((payment) => {
      if (!payment.paidAt) {
        return;
      }
      const month = payment.paidAt.toISOString().slice(0, 7);
      uniqueMonths.set(month, (uniqueMonths.get(month) ?? 0) + payment.amountCents);
    });

    return {
      totalRevenueCents: total,
      monthly: Array.from(uniqueMonths.entries()).map(([month, amount]) => ({ month, amount })),
    };
  }
}
