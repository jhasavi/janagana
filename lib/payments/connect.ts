import { prisma } from "@/lib/prisma";
import {
  connectAccountState,
  legacyPlatformTenantSlugs,
  resolvePaymentRouting,
  type PaymentRouting,
} from "@/lib/payments/connect-routing";
import {
  retrieveStripeConnectAccount,
  stripeCheckoutConfigured,
  type StripeConnectAccount,
} from "@/lib/payments/stripe";

const CONNECT_SELECT = {
  id: true,
  slug: true,
  stripeConnectAccountId: true,
  stripeConnectChargesEnabled: true,
} as const;

export async function loadPaymentRoutingForTenant(tenantId: string): Promise<PaymentRouting> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: CONNECT_SELECT });
  if (!tenant) {
    return { mode: "blocked", reason: "connect_not_onboarded", tipsEnabled: false };
  }
  return resolvePaymentRouting({
    stripeConfigured: stripeCheckoutConfigured(),
    tenant,
    legacySlugs: legacyPlatformTenantSlugs(),
  });
}

/** Persist Stripe's view of a connected account onto the tenant that owns it. */
export async function applyConnectAccountUpdate(account: StripeConnectAccount) {
  const tenant = await prisma.tenant.findUnique({
    where: { stripeConnectAccountId: account.id },
    select: { id: true, stripeConnectStatus: true },
  });
  if (!tenant) return null;

  const state = connectAccountState(account);
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      stripeConnectStatus: state.status,
      stripeConnectChargesEnabled: state.chargesEnabled,
      stripeConnectPayoutsEnabled: state.payoutsEnabled,
      stripeConnectDetailsSubmitted: state.detailsSubmitted,
      stripeConnectSyncedAt: new Date(),
    },
  });

  if (tenant.stripeConnectStatus !== state.status) {
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: null,
        action: "UPDATE",
        metadata: {
          entity: "TenantStripeConnect",
          source: "stripe_connect",
          stripeConnectAccountId: account.id,
          previousStatus: tenant.stripeConnectStatus,
          nextStatus: state.status,
        },
      },
    });
  }

  return { tenantId: tenant.id, ...state };
}

/** Called when an admin returns from Stripe onboarding, so status is fresh even if the webhook is delayed. */
export async function syncConnectAccountFromStripe(accountId: string) {
  const result = await retrieveStripeConnectAccount(accountId);
  if (!result.ok) return result;
  const applied = await applyConnectAccountUpdate(result.account);
  return { ok: true as const, state: applied };
}

/** The account was disconnected from the platform: stop routing payments to it. */
export async function markConnectAccountDeauthorized(accountId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { stripeConnectAccountId: accountId },
    select: { id: true },
  });
  if (!tenant) return null;
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      stripeConnectStatus: "RESTRICTED",
      stripeConnectChargesEnabled: false,
      stripeConnectPayoutsEnabled: false,
      stripeConnectSyncedAt: new Date(),
    },
  });
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: null,
      action: "UPDATE",
      metadata: { entity: "TenantStripeConnect", source: "stripe_connect", stripeConnectAccountId: accountId, deauthorized: true },
    },
  });
  return { tenantId: tenant.id };
}
