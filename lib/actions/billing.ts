"use server";

import { prisma } from "@/lib/prisma";
import { requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";
import { createStripeSubscriptionCheckoutSession, createBillingPortalSession, stripeCheckoutConfigured } from "@/lib/payments/stripe";
import { configuredAppUrl } from "@/lib/environment";
import { isPro } from "@/lib/plans/gate";
import { PRO_PLAN_MONTHLY_CENTS } from "@/lib/plans/pro-plan";

export async function createProUpgradeCheckout(options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  if (isPro(auth.context.tenant)) {
    return { ok: false as const, error: "This organization is already on Pro." };
  }
  if (!stripeCheckoutConfigured()) {
    return { ok: false as const, error: "Billing is not configured for this deployment." };
  }

  const baseUrl = configuredAppUrl();
  const checkout = await createStripeSubscriptionCheckoutSession({
    unitAmountCents: PRO_PLAN_MONTHLY_CENTS,
    interval: "month",
    customerEmail: auth.context.user.email ?? "",
    productName: "JanaGana Pro",
    successUrl: `${baseUrl}/dashboard/settings?success=upgraded#plan`,
    cancelUrl: `${baseUrl}/dashboard/settings?error=${encodeURIComponent("Upgrade canceled")}#plan`,
    clientReferenceId: auth.context.tenant.id,
    metadata: { tenantId: auth.context.tenant.id, purpose: "platform_subscription" },
  });

  if (!checkout.ok) {
    return { ok: false as const, error: checkout.error };
  }

  return { ok: true as const, checkoutUrl: checkout.url };
}

export async function createManageBillingSession(options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.context.tenant.id },
    select: { stripeCustomerId: true },
  });
  if (!tenant?.stripeCustomerId) {
    return { ok: false as const, error: "No billing account on file yet." };
  }

  const session = await createBillingPortalSession({
    customerId: tenant.stripeCustomerId,
    returnUrl: `${configuredAppUrl()}/dashboard/settings#plan`,
  });

  if (!session.ok) {
    return { ok: false as const, error: session.error };
  }

  return { ok: true as const, portalUrl: session.url };
}
