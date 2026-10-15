import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { issueReceiptForPayment } from "@/lib/payments/receipts";
import { queueEventRegistrationCommunication } from "@/lib/communications/outbox";
import { extendMembershipExpiration } from "@/lib/memberships/subscription-renewal";
import { recomputeLeadScore } from "@/lib/leads/scoring-actions";
import { applyConnectAccountUpdate, markConnectAccountDeauthorized } from "@/lib/payments/connect";
import {
  listStripeCheckoutSessionsForPaymentIntent,
  retrieveStripePaymentIntent,
  type StripeConnectAccount,
} from "@/lib/payments/stripe";
import {
  appendPaymentNote,
  isStripeCharge,
  localChargePaymentLookup,
  planChargeRefund,
  remoteChargePaymentLookup,
  type ChargePaymentLookup,
  type StripeChargeObject,
} from "@/lib/payments/refunds";

type StripeCheckoutSession = {
  id: string;
  object: "checkout.session";
  mode?: string;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  customer_email?: string | null;
  customer?: string | null;
  subscription?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

type StripeSubscription = {
  id: string;
  object: "subscription";
  customer?: string | null;
  status?: string;
  current_period_end?: number | null;
  metadata?: Record<string, string | undefined> | null;
};

type StripeInvoice = {
  id: string;
  object: "invoice";
  subscription?: string | null;
  amount_paid?: number;
  currency?: string | null;
  billing_reason?: string | null;
  application_fee_amount?: number | null;
  transfer_data?: { destination?: string | null } | null;
  metadata?: Record<string, string | undefined> | null;
};

type StripeEvent = {
  id: string;
  type: string;
  /** Present on events delivered from connected accounts (Connect webhook endpoint). */
  account?: string | null;
  data: {
    object: unknown;
  };
};

function isStripeInvoice(value: unknown): value is StripeInvoice {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { object?: unknown }).object === "invoice" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

async function attachStripeSubscription(input: {
  paymentId: string;
  subscriptionId: string;
  membershipId: string | null;
}) {
  await prisma.paymentRecord.update({
    where: { id: input.paymentId },
    data: { stripeSubscriptionId: input.subscriptionId },
  });
  if (input.membershipId) {
    await prisma.membership.update({
      where: { id: input.membershipId },
      data: { stripeSubscriptionId: input.subscriptionId, autoRenew: true },
    });
  }
}

/**
 * Subscription invoices repeat the first checkout's line items, so the tip and
 * routing recorded on the subscription's first payment apply to every renewal.
 */
async function renewalConnectFields(subscriptionId: string, amountPaidCents: number) {
  const first = await prisma.paymentRecord.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    orderBy: { createdAt: "asc" },
    select: { platformTipCents: true, applicationFeeCents: true, stripeConnectAccountId: true },
  });
  const platformTipCents = Math.min(first?.platformTipCents ?? 0, amountPaidCents);
  return {
    amountCents: amountPaidCents - platformTipCents,
    platformTipCents,
    applicationFeeCents: first?.applicationFeeCents ?? 0,
    stripeConnectAccountId: first?.stripeConnectAccountId ?? null,
  };
}

/** Checkout charges the org share plus any JanaGana tip; PaymentRecord.amountCents is the org share only. */
function orgAmountFromSession(session: StripeCheckoutSession, payment: { amountCents: number; platformTipCents: number }) {
  if (session.amount_total === null || session.amount_total === undefined) return payment.amountCents;
  return Math.max(0, session.amount_total - payment.platformTipCents);
}

async function processSubscriptionRenewalInvoice(invoice: StripeInvoice, event: StripeEvent) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId || invoice.billing_reason !== "subscription_cycle") {
    return { ok: true as const, duplicate: false, processed: false };
  }

  const existing = await prisma.paymentRecord.findFirst({
    where: { provider: "stripe", providerRef: invoice.id },
    select: { id: true },
  });
  if (existing) {
    return { ok: true as const, duplicate: true, processed: false };
  }

  const now = new Date();
  const currency = (invoice.currency ?? "usd").toUpperCase();
  const connectFields = await renewalConnectFields(subscriptionId, invoice.amount_paid ?? 0);

  const membership = await prisma.membership.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    include: {
      tier: true,
      contact: { select: { id: true } },
    },
  });

  if (membership) {
    const payment = await prisma.paymentRecord.create({
      data: {
        tenantId: membership.tenantId,
        contactId: membership.contactId,
        membershipId: membership.id,
        ...connectFields,
        currency,
        status: "PAID",
        method: "STRIPE",
        purpose: "MEMBERSHIP",
        provider: "stripe",
        providerRef: invoice.id,
        stripeSubscriptionId: subscriptionId,
        paidAt: now,
        notes: "Stripe subscription renewal",
      },
    });

    const nextExpiresAt = extendMembershipExpiration({
      currentExpiresAt: membership.expiresAt,
      interval: membership.tier.interval,
      from: now,
    });

    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        status: "ACTIVE",
        expiresAt: nextExpiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        actorUserId: null,
        action: "CREATE",
        metadata: {
          entity: "PaymentRecord",
          source: "stripe_invoice",
          purpose: "MEMBERSHIP",
          stripeEventId: event.id,
          stripeInvoiceId: invoice.id,
          paymentId: payment.id,
          membershipId: membership.id,
        },
      },
    });

    await issueReceiptForPayment(payment.id);
    return { ok: true as const, duplicate: false, processed: true, tenantId: membership.tenantId };
  }

  const anchor = await prisma.paymentRecord.findFirst({
    where: { stripeSubscriptionId: subscriptionId, purpose: "DONATION" },
    orderBy: { createdAt: "asc" },
    include: { contact: { select: { id: true } } },
  });

  if (!anchor?.contact) {
    return { ok: true as const, duplicate: false, processed: false };
  }

  const payment = await prisma.paymentRecord.create({
    data: {
      tenantId: anchor.tenantId,
      contactId: anchor.contactId,
      ...connectFields,
      currency,
      status: "PAID",
      method: "STRIPE",
      purpose: "DONATION",
      provider: "stripe",
      providerRef: invoice.id,
      stripeSubscriptionId: subscriptionId,
      paidAt: now,
      notes: "Monthly recurring donation",
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: anchor.tenantId,
      actorUserId: null,
      action: "CREATE",
      metadata: {
        entity: "PaymentRecord",
        source: "stripe_invoice",
        purpose: "DONATION",
        stripeEventId: event.id,
        stripeInvoiceId: invoice.id,
        paymentId: payment.id,
      },
    },
  });

  await issueReceiptForPayment(payment.id);
  return { ok: true as const, duplicate: false, processed: true, tenantId: anchor.tenantId };
}

async function processSponsorInvoicePaid(invoice: StripeInvoice, event: StripeEvent) {
  const sponsorInvoice = await prisma.sponsorInvoice.findUnique({
    where: { stripeInvoiceId: invoice.id },
    select: { id: true, tenantId: true, sponsorId: true, status: true, description: true },
  });
  if (!sponsorInvoice) {
    return { ok: true as const, duplicate: false, processed: false };
  }

  const existingPayment = await prisma.paymentRecord.findFirst({
    where: { provider: "stripe", providerRef: invoice.id },
    select: { id: true },
  });
  if (existingPayment || sponsorInvoice.status === "PAID") {
    return { ok: true as const, duplicate: true, processed: false, tenantId: sponsorInvoice.tenantId };
  }

  const now = new Date();
  const amountCents = invoice.amount_paid ?? 0;
  const currency = (invoice.currency ?? "usd").toUpperCase();

  const payment = await prisma.paymentRecord.create({
    data: {
      tenantId: sponsorInvoice.tenantId,
      sponsorInvoiceId: sponsorInvoice.id,
      amountCents,
      currency,
      status: "PAID",
      method: "STRIPE",
      purpose: "SPONSORSHIP",
      provider: "stripe",
      providerRef: invoice.id,
      applicationFeeCents: invoice.application_fee_amount ?? 0,
      stripeConnectAccountId: invoice.transfer_data?.destination ?? null,
      paidAt: now,
      notes: sponsorInvoice.description,
    },
  });

  await prisma.sponsorInvoice.update({
    where: { id: sponsorInvoice.id },
    data: { status: "PAID", paidAt: now },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: sponsorInvoice.tenantId,
      actorUserId: null,
      action: "UPDATE",
      metadata: {
        entity: "SponsorInvoice",
        source: "stripe_invoice",
        stripeEventId: event.id,
        stripeInvoiceId: invoice.id,
        sponsorInvoiceId: sponsorInvoice.id,
        sponsorId: sponsorInvoice.sponsorId,
        paymentId: payment.id,
      },
    },
  });

  return { ok: true as const, duplicate: false, processed: true, tenantId: sponsorInvoice.tenantId };
}

function isCheckoutSession(value: unknown): value is StripeCheckoutSession {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { object?: unknown }).object === "checkout.session" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

function isStripeSubscription(value: unknown): value is StripeSubscription {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { object?: unknown }).object === "subscription" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

function jsonMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as Prisma.InputJsonObject;
}

async function finalizeDonationPayment(
  payment: {
    id: string;
    tenantId: string;
    contactId: string | null;
    amountCents: number;
    platformTipCents: number;
    currency: string;
    paidAt: Date | null;
    contact: { id: string } | null;
  },
  session: StripeCheckoutSession,
  event: StripeEvent,
  paid: boolean,
) {
  const now = new Date();
  const nextPaymentStatus = paid ? "PAID" : "PENDING";

  await prisma.$transaction(async (tx) => {
    await tx.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: nextPaymentStatus,
        method: "STRIPE",
        provider: "stripe",
        providerRef: session.id,
        amountCents: orgAmountFromSession(session, payment),
        currency: (session.currency ?? payment.currency).toUpperCase(),
        paidAt: paid ? now : payment.paidAt,
        notes: paid ? "Stripe donation payment confirmed" : "Stripe Checkout completed; payment not marked paid",
      },
    });

    if (paid && payment.contact) {
      await tx.contact.update({
        where: { id: payment.contact.id },
        data: {
          type: "DONOR",
          lastActivityAt: now,
          lastActivitySummary: "Completed online donation",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: payment.tenantId,
        actorUserId: null,
        action: "UPDATE",
        metadata: {
          entity: "PaymentRecord",
          source: "stripe_webhook",
          purpose: "DONATION",
          stripeEventId: event.id,
          stripeCheckoutSessionId: session.id,
          paymentId: payment.id,
          nextPaymentStatus,
        },
      },
    });
  });

  if (paid) {
    await Promise.all([
      issueReceiptForPayment(payment.id),
      payment.contact ? recomputeLeadScore(payment.contact.id) : Promise.resolve(null),
    ]);
  }
}

async function finalizeMembershipPayment(
  payment: {
    id: string;
    tenantId: string;
    amountCents: number;
    platformTipCents: number;
    currency: string;
    paidAt: Date | null;
    contact: { id: string } | null;
    membership: {
      id: string;
      startsAt: Date | null;
      tier: { name: string };
    } | null;
  },
  session: StripeCheckoutSession,
  event: StripeEvent,
  paid: boolean,
) {
  const membership = payment.membership;
  const contact = payment.contact;
  if (!membership || !contact) {
    throw new Error("Membership payment is missing membership or contact");
  }

  const nextPaymentStatus = paid ? "PAID" : "PENDING";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: nextPaymentStatus,
        method: "STRIPE",
        provider: "stripe",
        providerRef: session.id,
        amountCents: orgAmountFromSession(session, payment),
        currency: (session.currency ?? payment.currency).toUpperCase(),
        paidAt: paid ? now : payment.paidAt,
        notes: paid ? "Stripe Checkout payment confirmed" : "Stripe Checkout completed; payment not marked paid",
      },
    });

    if (paid) {
      await tx.membership.update({
        where: { id: membership.id },
        data: {
          status: "ACTIVE",
          startsAt: membership.startsAt ?? now,
        },
      });

      await tx.contact.update({
        where: { id: contact.id },
        data: {
          type: "MEMBER",
          lastActivityAt: now,
          lastActivitySummary: `Paid for ${membership.tier.name}`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: payment.tenantId,
        actorUserId: null,
        action: "UPDATE",
        metadata: {
          entity: "PaymentRecord",
          source: "stripe_webhook",
          stripeEventId: event.id,
          stripeCheckoutSessionId: session.id,
          paymentId: payment.id,
          membershipId: membership.id,
          nextPaymentStatus,
        },
      },
    });
  });

  if (paid) {
    await Promise.all([issueReceiptForPayment(payment.id), recomputeLeadScore(contact.id)]);
  }
}

async function finalizeEventPayment(
  payment: {
    id: string;
    tenantId: string;
    amountCents: number;
    platformTipCents: number;
    currency: string;
    paidAt: Date | null;
    registrationId: string | null;
    contact: { id: string } | null;
  },
  session: StripeCheckoutSession,
  event: StripeEvent,
  paid: boolean,
) {
  const nextPaymentStatus = paid ? "PAID" : "PENDING";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: nextPaymentStatus,
        method: "STRIPE",
        provider: "stripe",
        providerRef: session.id,
        amountCents: orgAmountFromSession(session, payment),
        currency: (session.currency ?? payment.currency).toUpperCase(),
        paidAt: paid ? now : payment.paidAt,
        notes: paid ? "Stripe event ticket payment confirmed" : "Stripe Checkout completed; payment not marked paid",
      },
    });

    if (paid && payment.registrationId) {
      await tx.eventRegistration.update({
        where: { id: payment.registrationId },
        data: { status: "CONFIRMED" },
      });
    }

    if (paid && payment.contact) {
      await tx.contact.update({
        where: { id: payment.contact.id },
        data: {
          lastActivityAt: now,
          lastActivitySummary: "Paid for event registration",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: payment.tenantId,
        actorUserId: null,
        action: "UPDATE",
        metadata: {
          entity: "PaymentRecord",
          source: "stripe_webhook",
          purpose: "EVENT",
          stripeEventId: event.id,
          stripeCheckoutSessionId: session.id,
          paymentId: payment.id,
          registrationId: payment.registrationId,
          nextPaymentStatus,
        },
      },
    });
  });

  if (paid) {
    await Promise.all([
      issueReceiptForPayment(payment.id),
      payment.registrationId ? queueEventRegistrationCommunication(payment.registrationId) : Promise.resolve(null),
      payment.contact ? recomputeLeadScore(payment.contact.id) : Promise.resolve(null),
    ]);
  }
}

async function findStripePaymentForCharge(lookup: ChargePaymentLookup) {
  const or: Prisma.PaymentRecordWhereInput[] = [];
  if (lookup.paymentRecordIds.length) or.push({ id: { in: lookup.paymentRecordIds } });
  if (lookup.providerRefs.length) or.push({ providerRef: { in: lookup.providerRefs } });
  if (!or.length) return null;
  return prisma.paymentRecord.findFirst({
    where: { provider: "stripe", OR: or },
    select: { id: true, tenantId: true, status: true, notes: true },
  });
}

/**
 * Fires for dashboard refunds (already marked REFUNDED, so a no-op) and for
 * refunds issued directly in Stripe. Only a full refund flips the record;
 * partial refunds are audit-logged because PaymentStatus has no partial state.
 */
async function processChargeRefunded(charge: StripeChargeObject, event: StripeEvent) {
  let payment = await findStripePaymentForCharge(localChargePaymentLookup(charge));
  if (!payment) {
    const remote = await remoteChargePaymentLookup(charge, {
      retrievePaymentIntent: retrieveStripePaymentIntent,
      listCheckoutSessionsForPaymentIntent: listStripeCheckoutSessionsForPaymentIntent,
    });
    if (!remote.ok) return { ok: false as const, error: `charge.refunded lookup failed: ${remote.error}` };
    payment = await findStripePaymentForCharge(remote);
  }
  if (!payment) {
    return { ok: true as const, duplicate: false, processed: false, plan: "unmatched" as const, payment: null };
  }

  const plan = planChargeRefund(payment, charge);
  if (plan === "already_refunded" || plan === "status_not_refundable") {
    return { ok: true as const, duplicate: plan === "already_refunded", processed: false, plan, payment };
  }

  if (plan === "mark_refunded") {
    // Status guard makes a concurrent dashboard refund and this webhook converge on one update.
    const updated = await prisma.paymentRecord.updateMany({
      where: { id: payment.id, status: { in: ["PAID", "PENDING"] } },
      data: {
        status: "REFUNDED",
        notes: appendPaymentNote(payment.notes, `Refunded in Stripe (charge ${charge.id})`),
      },
    });
    if (updated.count === 0) {
      return { ok: true as const, duplicate: true, processed: false, plan: "already_refunded" as const, payment };
    }
  }

  await prisma.auditLog.create({
    data: {
      tenantId: payment.tenantId,
      actorUserId: null,
      action: "UPDATE",
      metadata: {
        entity: "PaymentRecord",
        source: "stripe_webhook",
        stripeEventId: event.id,
        stripeChargeId: charge.id,
        paymentId: payment.id,
        refundPlan: plan,
        amountRefundedCents: charge.amount_refunded ?? null,
        chargeAmountCents: charge.amount ?? null,
      },
    },
  });

  return { ok: true as const, duplicate: false, processed: plan === "mark_refunded", plan, payment };
}

export async function processStripeWebhookEvent(event: StripeEvent) {
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
    select: { id: true },
  });
  if (existing) {
    return { ok: true as const, duplicate: true, processed: false };
  }

  if (event.type === "invoice.paid") {
    if (!isStripeInvoice(event.data.object)) {
      return { ok: false as const, error: "Webhook event object is not an Invoice" };
    }
    const result =
      event.data.object.metadata?.purpose === "sponsor_invoice"
        ? await processSponsorInvoicePaid(event.data.object, event)
        : await processSubscriptionRenewalInvoice(event.data.object, event);
    await prisma.stripeWebhookEvent.create({
      data: {
        tenantId: "tenantId" in result && typeof result.tenantId === "string" ? result.tenantId : null,
        stripeEventId: event.id,
        eventType: event.type,
        metadata: jsonMetadata({
          processed: result.processed,
          duplicate: result.duplicate,
          invoiceId: event.data.object.id,
        }),
      },
    });
    return { ok: true as const, duplicate: result.duplicate, processed: result.processed };
  }

  if (event.type === "charge.refunded") {
    if (!isStripeCharge(event.data.object)) {
      return { ok: false as const, error: "Webhook event object is not a Charge" };
    }
    const result = await processChargeRefunded(event.data.object, event);
    if (!result.ok) return result;
    await prisma.stripeWebhookEvent.create({
      data: {
        tenantId: result.payment?.tenantId ?? null,
        stripeEventId: event.id,
        eventType: event.type,
        metadata: jsonMetadata({
          chargeId: event.data.object.id,
          paymentRecordId: result.payment?.id ?? null,
          plan: result.plan,
          processed: result.processed,
        }),
      },
    });
    return { ok: true as const, duplicate: result.duplicate, processed: result.processed };
  }

  if (event.type === "account.updated" || event.type === "account.application.deauthorized") {
    const accountId =
      event.type === "account.updated" ? (event.data.object as { id?: string } | null)?.id ?? null : event.account ?? null;
    if (!accountId) {
      return { ok: false as const, error: `${event.type} event is missing the connected account id` };
    }
    const result =
      event.type === "account.updated"
        ? await applyConnectAccountUpdate(event.data.object as StripeConnectAccount)
        : await markConnectAccountDeauthorized(accountId);
    await prisma.stripeWebhookEvent.create({
      data: {
        tenantId: result?.tenantId ?? null,
        stripeEventId: event.id,
        eventType: event.type,
        metadata: jsonMetadata({
          stripeConnectAccountId: accountId,
          processed: Boolean(result),
          status: result && "status" in result ? result.status : null,
        }),
      },
    });
    return { ok: true as const, duplicate: false, processed: Boolean(result) };
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        metadata: jsonMetadata({ ignored: true }),
      },
    });
    return { ok: true as const, duplicate: false, processed: false };
  }

  if (!isCheckoutSession(event.data.object)) {
    return { ok: false as const, error: "Webhook event object is not a Checkout Session" };
  }

  const session = event.data.object;

  const paymentRecordId = session.metadata?.paymentRecordId ?? session.client_reference_id ?? null;
  if (!paymentRecordId) {
    return { ok: false as const, error: "Checkout Session is missing payment metadata" };
  }

  const payment = await prisma.paymentRecord.findFirst({
    where: {
      OR: [{ id: paymentRecordId }, { provider: "stripe", providerRef: session.id }],
    },
    include: {
      membership: { include: { tier: true } },
      contact: true,
      registration: true,
    },
  });

  if (!payment) {
    return { ok: false as const, error: "Payment record not found for Checkout Session" };
  }

  const paid = session.payment_status === "paid" || event.type === "checkout.session.async_payment_succeeded";

  if (payment.purpose === "DONATION") {
    if (!payment.contact) {
      return { ok: false as const, error: "Donation payment is missing contact" };
    }
    await finalizeDonationPayment(payment, session, event, paid);
  } else if (payment.purpose === "MEMBERSHIP") {
    if (!payment.membership || !payment.contact) {
      return { ok: false as const, error: "Membership payment is missing membership or contact" };
    }
    await finalizeMembershipPayment(payment, session, event, paid);
  } else if (payment.purpose === "EVENT") {
    if (!payment.contact) {
      return { ok: false as const, error: "Event payment is missing contact" };
    }
    await finalizeEventPayment(payment, session, event, paid);
  } else {
    return { ok: false as const, error: `Unsupported payment purpose for Checkout Session: ${payment.purpose}` };
  }

  if (session.subscription) {
    await attachStripeSubscription({
      paymentId: payment.id,
      subscriptionId: session.subscription,
      membershipId: payment.membershipId,
    });
  }

  await prisma.stripeWebhookEvent.upsert({
    where: { stripeEventId: event.id },
    update: {
      tenantId: payment.tenantId,
      eventType: event.type,
      metadata: jsonMetadata({
        checkoutSessionId: session.id,
        paymentRecordId: payment.id,
        purpose: payment.purpose,
        membershipId: payment.membershipId,
        subscriptionId: session.subscription ?? null,
        paid,
      }),
    },
    create: {
      tenantId: payment.tenantId,
      stripeEventId: event.id,
      eventType: event.type,
      metadata: jsonMetadata({
        checkoutSessionId: session.id,
        paymentRecordId: payment.id,
        purpose: payment.purpose,
        membershipId: payment.membershipId,
        subscriptionId: session.subscription ?? null,
        paid,
      }),
    },
  });

  return { ok: true as const, duplicate: false, processed: true };
}
