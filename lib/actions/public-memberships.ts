import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { configuredAppUrl, publicPortalUrl } from "@/lib/environment";
import { getTenantBySlug } from "@/lib/tenant";
import { issueReceiptForPayment } from "@/lib/payments/receipts";
import {
  createStripeCheckoutSession,
  createStripeSubscriptionCheckoutSession,
  membershipIntervalToStripe,
  stripeCheckoutConfigured,
} from "@/lib/payments/stripe";
import { addMembershipInterval } from "@/lib/memberships/subscription-renewal";
import { calculateCheckoutAmount, calculatePlatformFeeCents, JANAGANA_PLATFORM_FEE_BPS } from "@/lib/payments/fee-policy";
import { recomputeLeadScore } from "@/lib/leads/scoring-actions";

const PublicMembershipCheckoutSchema = z
  .object({
    tenantSlug: z.string().trim().min(1),
    tierId: z.string().trim().min(1),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    coverProcessingFee: z.boolean().optional().default(false),
    autoRenew: z.boolean().optional().default(false),
    utmSource: z.string().trim().max(120).optional().or(z.literal("")),
    utmMedium: z.string().trim().max(120).optional().or(z.literal("")),
    utmCampaign: z.string().trim().max(120).optional().or(z.literal("")),
    referrerUrl: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .strict();

function addInterval(date: Date, interval: "MONTHLY" | "ANNUAL" | "ONE_TIME") {
  return addMembershipInterval(date, interval);
}

export async function listPublicMembershipTiers(tenantSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return { ok: false as const, tenant: null, data: [] as any[], error: "Community not found" };
  }

  const tiers = await prisma.membershipTier.findMany({
    where: {
      tenantId: tenant.id,
      active: true,
    },
    orderBy: [{ amountCents: "asc" }, { name: "asc" }],
  });

  return { ok: true as const, tenant, data: tiers };
}

export async function createPublicMembershipCheckout(input: unknown) {
  const parsed = PublicMembershipCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      checkoutUrl: null,
      error: parsed.error.issues[0]?.message ?? "Invalid membership signup input",
    };
  }

  const tenant = await getTenantBySlug(parsed.data.tenantSlug);
  if (!tenant) {
    return { ok: false as const, checkoutUrl: null, error: "Community not found" };
  }

  const tier = await prisma.membershipTier.findFirst({
    where: {
      id: parsed.data.tierId,
      tenantId: tenant.id,
      active: true,
    },
  });
  if (!tier) {
    return { ok: false as const, checkoutUrl: null, error: "Membership tier not found" };
  }

  if (tier.amountCents > 0 && !stripeCheckoutConfigured()) {
    return {
      ok: false as const,
      checkoutUrl: null,
      error: "Online membership checkout is not configured yet. Please contact the organizer.",
    };
  }

  const now = new Date();
  const email = parsed.data.email.toLowerCase();
  const phone = parsed.data.phone || null;
  const expiresAt = addInterval(now, tier.interval);
  const amounts = calculateCheckoutAmount({
    baseCents: tier.amountCents,
    coverProcessingFee: parsed.data.coverProcessingFee,
  });
  const stripeInterval = membershipIntervalToStripe(tier.interval);
  const useSubscription = Boolean(stripeInterval && parsed.data.autoRenew);

  const result = await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone,
        source: "public_membership_checkout",
        interestType: "MEMBERSHIP_CHECKOUT",
        lastActivityAt: now,
        lastActivitySummary:
          tier.amountCents > 0 ? `Started checkout for ${tier.name}` : `Joined ${tier.name}`,
      },
      create: {
        tenantId: tenant.id,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email,
        phone,
        type: tier.amountCents > 0 ? "OTHER" : "MEMBER",
        source: "public_membership_checkout",
        interestType: "MEMBERSHIP_CHECKOUT",
        lastActivityAt: now,
        lastActivitySummary:
          tier.amountCents > 0 ? `Started checkout for ${tier.name}` : `Joined ${tier.name}`,
        tags: ["membership-checkout"],
        utmSource: parsed.data.utmSource || null,
        utmMedium: parsed.data.utmMedium || null,
        utmCampaign: parsed.data.utmCampaign || null,
        referrerUrl: parsed.data.referrerUrl || null,
      },
    });

    const membership = await tx.membership.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        tierId: tier.id,
        status: tier.amountCents > 0 ? "PENDING" : "ACTIVE",
        startsAt: now,
        expiresAt,
        autoRenew: useSubscription,
        source: "public_checkout",
      },
    });

    const payment = await tx.paymentRecord.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        membershipId: membership.id,
        amountCents: tier.amountCents > 0 ? amounts.totalCents : 0,
        currency: "USD",
        status: tier.amountCents > 0 ? "PENDING" : "WAIVED",
        method: tier.amountCents > 0 ? "STRIPE" : "OTHER",
        purpose: "MEMBERSHIP",
        provider: tier.amountCents > 0 ? "stripe" : null,
        paidAt: tier.amountCents > 0 ? null : now,
        notes:
          tier.amountCents > 0
            ? amounts.processingFeeCents
              ? `Checkout started · member covered $${(amounts.processingFeeCents / 100).toFixed(2)} processing`
              : "Public membership checkout started"
            : "Free membership checkout",
      },
    });

    return { contact, membership, payment };
  });

  if (tier.amountCents === 0) {
    await issueReceiptForPayment(result.payment.id);
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: null,
        action: "CREATE",
        metadata: {
          entity: "Membership",
          source: "public_checkout_free",
          membershipId: result.membership.id,
          contactId: result.contact.id,
          paymentId: result.payment.id,
        },
      },
    });

    await recomputeLeadScore(result.contact.id);

    return {
      ok: true as const,
      checkoutUrl: `${publicPortalUrl(tenant.slug)}/join?status=joined`,
      error: null,
    };
  }

  const successUrl = `${configuredAppUrl()}/portal/${tenant.slug}/join?status=processing&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${configuredAppUrl()}/portal/${tenant.slug}/join?status=canceled`;
  const checkoutMetadata = {
    paymentRecordId: result.payment.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    membershipId: result.membership.id,
    contactId: result.contact.id,
    tierId: tier.id,
    purpose: "MEMBERSHIP",
    baseAmountCents: String(amounts.baseCents),
    processingFeeCents: String(amounts.processingFeeCents),
    coverProcessingFee: amounts.processingFeeCents > 0 ? "true" : "false",
    recurring: useSubscription ? "true" : "false",
    janaganaPlatformFeeBps: String(JANAGANA_PLATFORM_FEE_BPS),
    janaganaPlatformFeeCents: String(calculatePlatformFeeCents(amounts.baseCents)),
  };

  const checkout = useSubscription && stripeInterval
    ? await createStripeSubscriptionCheckoutSession({
        unitAmountCents: amounts.totalCents,
        currency: "USD",
        interval: stripeInterval,
        customerEmail: email,
        productName: `${tenant.name} - ${tier.name}`,
        successUrl,
        cancelUrl,
        clientReferenceId: result.payment.id,
        metadata: checkoutMetadata,
      })
    : await createStripeCheckoutSession({
        amountCents: amounts.totalCents,
        currency: "USD",
        customerEmail: email,
        productName: `${tenant.name} - ${tier.name}`,
        successUrl,
        cancelUrl,
        clientReferenceId: result.payment.id,
        metadata: checkoutMetadata,
      });

  if (!checkout.ok) {
    await prisma.paymentRecord.update({
      where: { id: result.payment.id },
      data: {
        status: "FAILED",
        notes: checkout.error,
      },
    });
    await prisma.membership.update({
      where: { id: result.membership.id },
      data: {
        status: "CANCELED",
        notes: "Stripe Checkout session could not be created.",
      },
    });
    return { ok: false as const, checkoutUrl: null, error: checkout.error };
  }

  await prisma.paymentRecord.update({
    where: { id: result.payment.id },
    data: {
      providerRef: checkout.sessionId,
      notes: "Stripe Checkout session created",
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: null,
      action: "CREATE",
      metadata: {
        entity: "MembershipCheckout",
        source: "public_checkout",
        membershipId: result.membership.id,
        contactId: result.contact.id,
        paymentId: result.payment.id,
        stripeCheckoutSessionId: checkout.sessionId,
      },
    },
  });

  return { ok: true as const, checkoutUrl: checkout.url, error: null };
}
