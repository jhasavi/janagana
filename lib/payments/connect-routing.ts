import type { StripeConnectStatus } from "@prisma/client";
import type { StripeConnectAccount } from "@/lib/payments/stripe";

/**
 * Tenants allowed to keep charging on the shared platform Stripe account until
 * they finish Connect onboarding. Unset → the two original pilots. Set to an
 * empty string to turn the fallback off entirely.
 */
export const DEFAULT_LEGACY_PLATFORM_TENANT_SLUGS = ["namaste-boston", "purple-wings"] as const;

export function legacyPlatformTenantSlugs(env: Record<string, string | undefined> = process.env): string[] {
  const raw = env.STRIPE_CONNECT_LEGACY_TENANT_SLUGS;
  if (raw === undefined) return [...DEFAULT_LEGACY_PLATFORM_TENANT_SLUGS];
  return raw
    .split(",")
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean);
}

/** Admin page where an org connects its Stripe account. */
export const PAYMENTS_SETTINGS_PATH = "/dashboard/settings/payments";

export type PaymentRouting =
  /** Destination charge to the tenant's own connected account; tips enabled. */
  | { mode: "connect"; destinationAccountId: string; tipsEnabled: true }
  /** Pilot fallback: charge lands on the platform account as before Connect; no tips. */
  | { mode: "legacy_platform"; tipsEnabled: false }
  | { mode: "blocked"; reason: "stripe_not_configured" | "connect_not_onboarded"; tipsEnabled: false };

export type TenantConnectState = {
  slug: string;
  stripeConnectAccountId: string | null;
  stripeConnectChargesEnabled: boolean;
};

export function resolvePaymentRouting(input: {
  stripeConfigured: boolean;
  tenant: TenantConnectState;
  legacySlugs: string[];
}): PaymentRouting {
  if (!input.stripeConfigured) {
    return { mode: "blocked", reason: "stripe_not_configured", tipsEnabled: false };
  }
  if (input.tenant.stripeConnectAccountId && input.tenant.stripeConnectChargesEnabled) {
    return { mode: "connect", destinationAccountId: input.tenant.stripeConnectAccountId, tipsEnabled: true };
  }
  if (input.legacySlugs.includes(input.tenant.slug.toLowerCase())) {
    return { mode: "legacy_platform", tipsEnabled: false };
  }
  return { mode: "blocked", reason: "connect_not_onboarded", tipsEnabled: false };
}

export function paymentRoutingAllowsCheckout(routing: PaymentRouting) {
  return routing.mode !== "blocked";
}

/** Shown to donors/members on the public portal when online payment is unavailable. */
export const PUBLIC_PAYMENTS_UNAVAILABLE_MESSAGE =
  "Online payments are not set up for this organization yet. Please contact the organizer.";

/** Shown to org admins in the dashboard. */
export function adminPaymentRoutingMessage(routing: PaymentRouting) {
  if (routing.mode === "connect") return null;
  if (routing.mode === "legacy_platform") {
    return "Payments are temporarily collected on JanaGana's shared Stripe account for this pilot. Connect your organization's Stripe account in Settings → Payments so money goes straight to you.";
  }
  if (routing.reason === "stripe_not_configured") {
    return "Online payments are unavailable: Stripe is not configured for this JanaGana deployment.";
  }
  return "Online payments are off. Paid donations, memberships, and event tickets are blocked until you connect your organization's Stripe account in Settings → Payments.";
}

/** Readiness for destination charges: Stripe can charge AND transfer funds to the account. */
export function connectAccountState(account: StripeConnectAccount): {
  status: StripeConnectStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
} {
  const transfersActive = account.capabilities?.transfers === "active";
  const chargesEnabled = Boolean(account.charges_enabled) && transfersActive;
  const detailsSubmitted = Boolean(account.details_submitted);
  const status: StripeConnectStatus = chargesEnabled
    ? "ACTIVE"
    : detailsSubmitted
      ? "RESTRICTED"
      : "PENDING";
  return {
    status,
    chargesEnabled,
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted,
  };
}
