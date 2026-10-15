import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { configuredAppUrl } from "@/lib/environment";
import { getTenantBySlug } from "@/lib/tenant";
import { calculatePlatformFeeCents, JANAGANA_PLATFORM_FEE_BPS } from "@/lib/payments/fee-policy";
import { loadPaymentRoutingForTenant } from "@/lib/payments/connect";
import { PUBLIC_PAYMENTS_UNAVAILABLE_MESSAGE } from "@/lib/payments/connect-routing";
import {
  checkoutAmountsForRouting,
  createTenantCheckoutSession,
  paymentRecordConnectFields,
  platformTipInputSchema,
} from "@/lib/payments/tenant-checkout";
import { recordReferralRedemption, resolveActiveReferralCode } from "@/lib/actions/referrals";

export const DONATION_PRESET_CENTS = [2500, 5000, 10000, 25000, 50000] as const;
export const MIN_DONATION_CENTS = 100;
export const MAX_DONATION_CENTS = 500_000;

const PublicDonationCheckoutSchema = z
  .object({
    tenantSlug: z.string().trim().min(1),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    amountCents: z.number().int().min(MIN_DONATION_CENTS).max(MAX_DONATION_CENTS),
    dedication: z.string().trim().max(500).optional().or(z.literal("")),
    coverProcessingFee: z.boolean().optional().default(false),
    recurringMonthly: z.boolean().optional().default(false),
    utmSource: z.string().trim().max(120).optional().or(z.literal("")),
    utmMedium: z.string().trim().max(120).optional().or(z.literal("")),
    utmCampaign: z.string().trim().max(120).optional().or(z.literal("")),
    referrerUrl: z.string().trim().max(500).optional().or(z.literal("")),
    ref: z.string().trim().max(40).optional().or(z.literal("")),
    campaignSlug: z.string().trim().max(120).optional().or(z.literal("")),
    fundraiserSlug: z.string().trim().max(120).optional().or(z.literal("")),
    ...platformTipInputSchema,
  })
  .strict();

export async function getPublicDonationContext(tenantSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return { ok: false as const, tenant: null, stripeEnabled: false, tipsEnabled: false };
  }
  const routing = await loadPaymentRoutingForTenant(tenant.id);
  return {
    ok: true as const,
    tenant,
    stripeEnabled: routing.mode !== "blocked",
    tipsEnabled: routing.tipsEnabled,
    presets: DONATION_PRESET_CENTS,
  };
}

export async function createPublicDonationCheckout(input: unknown) {
  const parsed = PublicDonationCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      checkoutUrl: null,
      error: parsed.error.issues[0]?.message ?? "Invalid donation input",
    };
  }

  const tenant = await getTenantBySlug(parsed.data.tenantSlug);
  if (!tenant) {
    return { ok: false as const, checkoutUrl: null, error: "Community not found" };
  }

  const routing = await loadPaymentRoutingForTenant(tenant.id);
  if (routing.mode === "blocked") {
    return { ok: false as const, checkoutUrl: null, error: PUBLIC_PAYMENTS_UNAVAILABLE_MESSAGE };
  }

  const now = new Date();
  const email = parsed.data.email.toLowerCase();
  const phone = parsed.data.phone || null;
  const dedication = parsed.data.dedication?.trim() || null;
  const amounts = checkoutAmountsForRouting({
    routing,
    baseCents: parsed.data.amountCents,
    coverProcessingFee: parsed.data.coverProcessingFee,
    platformTipChoice: parsed.data.platformTipChoice,
    platformTipCustomCents: parsed.data.platformTipCustomCents,
  });
  const useSubscription = parsed.data.recurringMonthly;
  const refCode = (parsed.data.ref || "").trim().toUpperCase() || null;
  const referralCode = refCode ? await resolveActiveReferralCode(tenant.id, refCode) : null;
  const existingContact = await prisma.contact.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    select: { id: true },
  });

  let peerFundraiser: { id: string; campaignId: string; slug: string } | null = null;
  if (parsed.data.fundraiserSlug) {
    peerFundraiser = await prisma.peerFundraiser.findFirst({
      where: { tenantId: tenant.id, slug: parsed.data.fundraiserSlug, active: true },
      select: { id: true, campaignId: true, slug: true },
    });
  }
  let campaignId = peerFundraiser?.campaignId ?? null;
  if (!campaignId && parsed.data.campaignSlug) {
    const campaign = await prisma.campaign.findFirst({
      where: { tenantId: tenant.id, slug: parsed.data.campaignSlug, status: "PUBLISHED" },
      select: { id: true },
    });
    campaignId = campaign?.id ?? null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone,
        source: "public_donation",
        interestType: "DONATION",
        lastActivityAt: now,
        lastActivitySummary: "Started donation checkout",
      },
      create: {
        tenantId: tenant.id,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email,
        phone,
        type: "DONOR",
        source: "public_donation",
        interestType: "DONATION",
        lastActivityAt: now,
        lastActivitySummary: "Started donation checkout",
        tags: ["donor"],
        utmSource: parsed.data.utmSource || null,
        utmMedium: parsed.data.utmMedium || null,
        utmCampaign: parsed.data.utmCampaign || null,
        referrerUrl: parsed.data.referrerUrl || null,
        referredByCode: referralCode?.code ?? null,
      },
    });

    const payment = await tx.paymentRecord.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        campaignId,
        peerFundraiserId: peerFundraiser?.id ?? null,
        ...paymentRecordConnectFields(routing, amounts),
        currency: "USD",
        status: "PENDING",
        method: "STRIPE",
        purpose: "DONATION",
        provider: "stripe",
        notes: dedication
          ? `Dedication: ${dedication}${amounts.processingFeeCents ? ` · Donor covered $${(amounts.processingFeeCents / 100).toFixed(2)} processing` : ""}`
          : amounts.processingFeeCents
            ? `Donor covered $${(amounts.processingFeeCents / 100).toFixed(2)} processing`
            : "Public donation checkout started",
      },
    });

    return { contact, payment };
  });

  if (!existingContact && referralCode) {
    await recordReferralRedemption(tenant.id, referralCode.id, result.contact.id);
  }

  const returnBase = peerFundraiser
    ? `${configuredAppUrl()}/portal/${tenant.slug}/fundraise/${peerFundraiser.slug}`
    : `${configuredAppUrl()}/portal/${tenant.slug}/donate`;
  const successUrl = `${returnBase}?status=thankyou&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${returnBase}?status=canceled`;
  const checkoutMetadata = {
    paymentRecordId: result.payment.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    contactId: result.contact.id,
    purpose: "DONATION",
    campaignId: campaignId ?? "",
    peerFundraiserId: peerFundraiser?.id ?? "",
    baseAmountCents: String(amounts.baseCents),
    processingFeeCents: String(amounts.processingFeeCents),
    coverProcessingFee: amounts.processingFeeCents > 0 ? "true" : "false",
    recurring: useSubscription ? "true" : "false",
    janaganaPlatformFeeBps: String(JANAGANA_PLATFORM_FEE_BPS),
    janaganaPlatformFeeCents: String(calculatePlatformFeeCents(amounts.baseCents)),
  };

  const donationLabel = peerFundraiser
    ? `${tenant.name} via a supporter's fundraising page`
    : tenant.name;

  const checkout = await createTenantCheckoutSession({
    routing,
    amounts,
    recurringInterval: useSubscription ? "month" : null,
    currency: "USD",
    customerEmail: email,
    productName: useSubscription ? `Monthly donation to ${donationLabel}` : `Donation to ${donationLabel}`,
    successUrl,
    cancelUrl,
    clientReferenceId: result.payment.id,
    metadata: checkoutMetadata,
  });

  if (!checkout.ok) {
    await prisma.paymentRecord.update({
      where: { id: result.payment.id },
      data: { status: "FAILED", notes: checkout.error },
    });
    return { ok: false as const, checkoutUrl: null, error: checkout.error };
  }

  await prisma.paymentRecord.update({
    where: { id: result.payment.id },
    data: {
      providerRef: checkout.sessionId,
      notes: dedication
        ? `Stripe Checkout session created. Dedication: ${dedication}`
        : "Stripe Checkout session created",
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: null,
      action: "CREATE",
      metadata: {
        entity: "DonationCheckout",
        source: "public_donate",
        contactId: result.contact.id,
        paymentId: result.payment.id,
        amountCents: parsed.data.amountCents,
        platformTipCents: amounts.platformTipCents,
        paymentRouting: routing.mode,
        stripeCheckoutSessionId: checkout.sessionId,
      },
    },
  });

  return { ok: true as const, checkoutUrl: checkout.url, error: null };
}
