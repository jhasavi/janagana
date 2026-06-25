import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { configuredAppUrl } from "@/lib/environment";
import { getTenantBySlug } from "@/lib/tenant";
import { calculatePlatformFeeCents, JANAGANA_PLATFORM_FEE_BPS } from "@/lib/payments/fee-policy";
import { createStripeCheckoutSession, stripeCheckoutConfigured } from "@/lib/payments/stripe";

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
  })
  .strict();

export async function getPublicDonationContext(tenantSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return { ok: false as const, tenant: null, stripeEnabled: false };
  }
  return {
    ok: true as const,
    tenant,
    stripeEnabled: stripeCheckoutConfigured(),
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

  if (!stripeCheckoutConfigured()) {
    return {
      ok: false as const,
      checkoutUrl: null,
      error: "Online donations are not configured yet. Please contact the organizer.",
    };
  }

  const now = new Date();
  const email = parsed.data.email.toLowerCase();
  const phone = parsed.data.phone || null;
  const dedication = parsed.data.dedication?.trim() || null;

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
      },
    });

    const payment = await tx.paymentRecord.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        amountCents: parsed.data.amountCents,
        currency: "USD",
        status: "PENDING",
        method: "STRIPE",
        purpose: "DONATION",
        provider: "stripe",
        notes: dedication ? `Dedication: ${dedication}` : "Public donation checkout started",
      },
    });

    return { contact, payment };
  });

  const successUrl = `${configuredAppUrl()}/portal/${tenant.slug}/donate?status=thankyou&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${configuredAppUrl()}/portal/${tenant.slug}/donate?status=canceled`;

  const checkout = await createStripeCheckoutSession({
    amountCents: parsed.data.amountCents,
    currency: "USD",
    customerEmail: email,
    productName: `Donation to ${tenant.name}`,
    successUrl,
    cancelUrl,
    clientReferenceId: result.payment.id,
    metadata: {
      paymentRecordId: result.payment.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      contactId: result.contact.id,
      purpose: "DONATION",
      janaganaPlatformFeeBps: String(JANAGANA_PLATFORM_FEE_BPS),
      janaganaPlatformFeeCents: String(calculatePlatformFeeCents(parsed.data.amountCents)),
    },
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
        stripeCheckoutSessionId: checkout.sessionId,
      },
    },
  });

  return { ok: true as const, checkoutUrl: checkout.url, error: null };
}
