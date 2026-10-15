#!/usr/bin/env tsx
/**
 * Stripe Connect routing, destination-charge params, not-onboarded guard,
 * account status mapping, and platform-admin gating. No DB or network.
 *
 *   npm run test:stripe-connect
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  adminPaymentRoutingMessage,
  connectAccountState,
  DEFAULT_LEGACY_PLATFORM_TENANT_SLUGS,
  legacyPlatformTenantSlugs,
  paymentRoutingAllowsCheckout,
  resolvePaymentRouting,
} from "@/lib/payments/connect-routing";
import {
  buildStripeCheckoutSessionParams,
  buildStripeSubscriptionCheckoutSessionParams,
  PLATFORM_TIP_LINE_ITEM_NAME,
} from "@/lib/payments/stripe";
import { calculateCheckoutAmount } from "@/lib/payments/fee-policy";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";

const ROOT = process.cwd();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const onboarded = { slug: "new-org", stripeConnectAccountId: "acct_123", stripeConnectChargesEnabled: true };
const notOnboarded = { slug: "new-org", stripeConnectAccountId: null, stripeConnectChargesEnabled: false };
const midOnboarding = { slug: "new-org", stripeConnectAccountId: "acct_123", stripeConnectChargesEnabled: false };
const pilot = { slug: "namaste-boston", stripeConnectAccountId: null, stripeConnectChargesEnabled: false };
const pilotOnboarded = { slug: "purple-wings", stripeConnectAccountId: "acct_pw", stripeConnectChargesEnabled: true };
const legacySlugs = [...DEFAULT_LEGACY_PLATFORM_TENANT_SLUGS];

function testRouting() {
  const connect = resolvePaymentRouting({ stripeConfigured: true, tenant: onboarded, legacySlugs });
  assert(connect.mode === "connect" && connect.destinationAccountId === "acct_123", "onboarded tenant routes to its account");
  assert(connect.tipsEnabled, "tips enabled on Connect");
  assert(adminPaymentRoutingMessage(connect) === null, "no admin warning once connected");

  const blocked = resolvePaymentRouting({ stripeConfigured: true, tenant: notOnboarded, legacySlugs });
  assert(blocked.mode === "blocked" && blocked.reason === "connect_not_onboarded", "non-pilot without Connect is blocked");
  assert(!paymentRoutingAllowsCheckout(blocked), "blocked routing disallows checkout");
  assert(/blocked until you connect/i.test(adminPaymentRoutingMessage(blocked) ?? ""), "admin sees a clear blocked message");

  const pending = resolvePaymentRouting({ stripeConfigured: true, tenant: midOnboarding, legacySlugs });
  assert(pending.mode === "blocked", "account created but charges not enabled stays blocked");

  const legacy = resolvePaymentRouting({ stripeConfigured: true, tenant: pilot, legacySlugs });
  assert(legacy.mode === "legacy_platform" && !legacy.tipsEnabled, "pilots keep legacy platform charges until onboarded");
  assert(/temporarily/i.test(adminPaymentRoutingMessage(legacy) ?? ""), "pilot admins are nudged to connect");

  const pilotConnected = resolvePaymentRouting({ stripeConfigured: true, tenant: pilotOnboarded, legacySlugs });
  assert(pilotConnected.mode === "connect", "pilot switches to Connect once onboarded");

  const noStripe = resolvePaymentRouting({ stripeConfigured: false, tenant: onboarded, legacySlugs });
  assert(noStripe.mode === "blocked" && noStripe.reason === "stripe_not_configured", "no Stripe key blocks everything");

  assert(legacyPlatformTenantSlugs({}).join(",") === "namaste-boston,purple-wings", "default legacy list is the two pilots");
  assert(legacyPlatformTenantSlugs({ STRIPE_CONNECT_LEGACY_TENANT_SLUGS: "" }).length === 0, "empty env disables fallback");
  assert(
    legacyPlatformTenantSlugs({ STRIPE_CONNECT_LEGACY_TENANT_SLUGS: " Namaste-Boston , " }).join(",") === "namaste-boston",
    "env list is trimmed and lowercased",
  );
  console.log("PASS payment routing");
}

function testDestinationChargeParams() {
  const amounts = calculateCheckoutAmount({ baseCents: 5000, platformTipCents: 500 });
  const base = {
    currency: "USD",
    customerEmail: "donor@example.org",
    productName: "Donation to Test Org",
    successUrl: "https://app.test/ok",
    cancelUrl: "https://app.test/cancel",
    clientReferenceId: "pay_1",
    metadata: { paymentRecordId: "pay_1" },
  };

  const params = buildStripeCheckoutSessionParams({
    ...base,
    amountCents: amounts.orgAmountCents,
    platformTipCents: amounts.platformTipCents,
    connect: { destinationAccountId: "acct_123", applicationFeeCents: amounts.applicationFeeCents },
  });
  assert(params.get("payment_intent_data[transfer_data][destination]") === "acct_123", "destination set");
  assert(params.get("payment_intent_data[application_fee_amount]") === String(amounts.applicationFeeCents), "app fee set");
  assert(params.get("line_items[0][price_data][unit_amount]") === "5000", "org line item is the org share");
  assert(params.get("line_items[1][price_data][unit_amount]") === "500", "tip is its own line item");
  assert(params.get("line_items[1][price_data][product_data][name]") === PLATFORM_TIP_LINE_ITEM_NAME, "tip line is labeled");

  const legacy = buildStripeCheckoutSessionParams({ ...base, amountCents: 5000 });
  assert(!legacy.has("payment_intent_data[transfer_data][destination]"), "legacy charge has no destination");
  assert(!legacy.has("payment_intent_data[application_fee_amount]"), "legacy charge has no app fee");
  assert(!legacy.has("line_items[1][quantity]"), "no tip line without a tip");

  const sub = buildStripeSubscriptionCheckoutSessionParams({
    ...base,
    unitAmountCents: amounts.orgAmountCents,
    platformTipCents: amounts.platformTipCents,
    interval: "month",
    connect: { destinationAccountId: "acct_123", applicationFeePercent: 12.34 },
  });
  assert(sub.get("subscription_data[transfer_data][destination]") === "acct_123", "subscription destination set");
  assert(sub.get("subscription_data[application_fee_percent]") === "12.34", "subscription app fee percent set");
  assert(sub.get("line_items[1][price_data][recurring][interval]") === "month", "recurring tip shares the interval");
  console.log("PASS destination charge params");
}

function testAccountState() {
  const active = connectAccountState({
    id: "acct_1",
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
    capabilities: { transfers: "active", card_payments: "active" },
  });
  assert(active.status === "ACTIVE" && active.chargesEnabled, "fully enabled account is ACTIVE");

  const noTransfers = connectAccountState({
    id: "acct_1",
    charges_enabled: true,
    details_submitted: true,
    capabilities: { transfers: "pending" },
  });
  assert(!noTransfers.chargesEnabled && noTransfers.status === "RESTRICTED", "destination charges need transfers capability");

  const fresh = connectAccountState({ id: "acct_1" });
  assert(fresh.status === "PENDING" && !fresh.chargesEnabled, "new account is PENDING");
  console.log("PASS account status mapping");
}

function testPlatformAdmin() {
  const env = { JANAGANA_PLATFORM_ADMIN_EMAILS: "Ops@JanaGana.org, second@example.org" };
  assert(isPlatformAdmin({ email: "ops@janagana.org" }, env), "listed email is platform admin (case-insensitive)");
  assert(!isPlatformAdmin({ email: "admin@tenant.org" }, env), "tenant admin is not platform admin");
  assert(!isPlatformAdmin({ email: "ops@janagana.org" }, {}), "unset env means no platform admins");
  assert(!isPlatformAdmin(null, env), "signed-out user is not platform admin");
  console.log("PASS platform admin gate");
}

/** Every paid public checkout must consult routing and refuse when blocked. */
function testGuardWiring() {
  const donations = readFileSync(join(ROOT, "lib/actions/public-donations.ts"), "utf8");
  const memberships = readFileSync(join(ROOT, "lib/actions/public-memberships.ts"), "utf8");
  const events = readFileSync(join(ROOT, "lib/actions/public-portal.ts"), "utf8");
  const sponsors = readFileSync(join(ROOT, "lib/actions/sponsors.ts"), "utf8");
  for (const [name, source] of [
    ["donations", donations],
    ["memberships", memberships],
    ["events", events],
    ["sponsors", sponsors],
  ] as const) {
    assert(source.includes("loadPaymentRoutingForTenant"), `${name} checkout must resolve payment routing`);
    assert(source.includes('routing.mode === "blocked"') || source.includes('routing.mode !== "blocked"'), `${name} must guard blocked routing`);
    assert(!source.includes("stripeCheckoutConfigured()"), `${name} must not bypass routing with the global Stripe check`);
  }
  for (const [name, source] of [["donations", donations], ["memberships", memberships], ["events", events]] as const) {
    assert(source.includes("createTenantCheckoutSession"), `${name} must create checkout via the routed helper`);
    assert(!/createStripeCheckoutSession\(|createStripeSubscriptionCheckoutSession\(/.test(source), `${name} must not call raw Stripe checkout`);
  }
  assert(donations.includes("PUBLIC_PAYMENTS_UNAVAILABLE_MESSAGE"), "donations show unavailable message when blocked");
  assert(memberships.includes("PUBLIC_PAYMENTS_UNAVAILABLE_MESSAGE"), "memberships show unavailable message when blocked");

  const webhook = readFileSync(join(ROOT, "lib/payments/stripe-webhooks.ts"), "utf8");
  assert(webhook.includes('"account.updated"'), "webhook handles account.updated");
  assert(webhook.includes("orgAmountFromSession"), "webhook strips the tip from the org's recorded amount");
  const route = readFileSync(join(ROOT, "app/api/webhooks/stripe/route.ts"), "utf8");
  assert(route.includes("stripeConnectWebhookSecret"), "webhook route accepts the Connect endpoint secret");

  const layout = readFileSync(join(ROOT, "app/dashboard/layout.tsx"), "utf8");
  assert(layout.includes("adminPaymentRoutingMessage"), "dashboard shows admins the payments status banner");
  const tipsPage = readFileSync(join(ROOT, "app/dashboard/platform/tips/page.tsx"), "utf8");
  assert(tipsPage.includes("isPlatformAdmin") && tipsPage.includes("notFound()"), "tips report is platform-admin only");
  console.log("PASS not-onboarded guard wiring");
}

function main() {
  testRouting();
  testDestinationChargeParams();
  testAccountState();
  testPlatformAdmin();
  testGuardWiring();
  console.log("Stripe Connect checks passed");
}

main();
