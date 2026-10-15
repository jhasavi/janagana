"use server";

import { prisma } from "@/lib/prisma";
import { configuredAppUrl } from "@/lib/environment";
import { requireActiveTenantForActions, requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";
import { syncConnectAccountFromStripe } from "@/lib/payments/connect";
import { PAYMENTS_SETTINGS_PATH } from "@/lib/payments/connect-routing";
import {
  createStripeAccountLink,
  createStripeExpressAccount,
  createStripeExpressLoginLink,
  stripeCheckoutConfigured,
} from "@/lib/payments/stripe";

/**
 * Creates the tenant's Express account on first use, then returns a fresh
 * single-use Stripe-hosted onboarding link (Account Links expire quickly, so
 * "resume" always mints a new one).
 */
export async function startStripeConnectOnboarding(options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  if (!stripeCheckoutConfigured()) {
    return { ok: false as const, error: "Stripe is not configured for this JanaGana deployment." };
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: auth.context.tenant.id },
    select: { id: true, slug: true, name: true, publicContactEmail: true, stripeConnectAccountId: true },
  });

  let accountId = tenant.stripeConnectAccountId;
  if (!accountId) {
    const created = await createStripeExpressAccount({
      email: tenant.publicContactEmail ?? auth.context.user.email,
      businessName: tenant.name,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });
    if (!created.ok) return { ok: false as const, error: created.error };
    accountId = created.account.id;

    // Guard against a double-click creating two accounts: only claim if still empty.
    const claimed = await prisma.tenant.updateMany({
      where: { id: tenant.id, stripeConnectAccountId: null },
      data: { stripeConnectAccountId: accountId, stripeConnectStatus: "PENDING", stripeConnectSyncedAt: new Date() },
    });
    if (claimed.count === 0) {
      const current = await prisma.tenant.findUniqueOrThrow({
        where: { id: tenant.id },
        select: { stripeConnectAccountId: true },
      });
      accountId = current.stripeConnectAccountId ?? accountId;
    } else {
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: auth.context.user.id,
          action: "CREATE",
          metadata: { entity: "TenantStripeConnect", stripeConnectAccountId: accountId },
        },
      });
    }
  }

  const base = `${configuredAppUrl()}${PAYMENTS_SETTINGS_PATH}`;
  const link = await createStripeAccountLink({
    accountId,
    refreshUrl: `${base}?connect=refresh`,
    returnUrl: `${base}?connect=return`,
  });
  if (!link.ok) return { ok: false as const, error: link.error };
  return { ok: true as const, url: link.url, tenantId: tenant.id };
}

/** Refreshes onboarding status from Stripe (used on return from onboarding). */
export async function refreshStripeConnectStatus(options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.context.tenant.id },
    select: { stripeConnectAccountId: true },
  });
  if (!tenant?.stripeConnectAccountId || !stripeCheckoutConfigured()) {
    return { ok: true as const, synced: false };
  }
  const result = await syncConnectAccountFromStripe(tenant.stripeConnectAccountId);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, synced: true };
}

export async function openStripeExpressDashboard(options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.context.tenant.id },
    select: { id: true, stripeConnectAccountId: true, stripeConnectDetailsSubmitted: true },
  });
  if (!tenant?.stripeConnectAccountId || !tenant.stripeConnectDetailsSubmitted) {
    return { ok: false as const, error: "Finish Stripe onboarding first." };
  }
  const link = await createStripeExpressLoginLink(tenant.stripeConnectAccountId);
  if (!link.ok) return { ok: false as const, error: link.error };
  return { ok: true as const, url: link.url, tenantId: tenant.id };
}
