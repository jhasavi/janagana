#!/usr/bin/env tsx
/**
 * Subscription billing contract tests (Sprint 2).
 *
 *   npm run test:subscriptions
 */
import { readFileSync } from "fs";
import { join } from "path";
import { membershipIntervalToStripe } from "@/lib/payments/stripe";
import { extendMembershipExpiration } from "@/lib/memberships/subscription-renewal";

const ROOT = process.cwd();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function testIntervalMapping() {
  assert(membershipIntervalToStripe("MONTHLY") === "month", "MONTHLY → month");
  assert(membershipIntervalToStripe("ANNUAL") === "year", "ANNUAL → year");
  assert(membershipIntervalToStripe("ONE_TIME") === null, "ONE_TIME → null");
  console.log("PASS interval mapping");
}

function testExpirationExtension() {
  const base = new Date("2030-01-15T12:00:00.000Z");
  const monthly = extendMembershipExpiration({
    currentExpiresAt: base,
    interval: "MONTHLY",
    from: base,
  });
  assert(monthly !== null && monthly > base, "monthly extension advances date");
  console.log("PASS expiration extension");
}

function testStaticWiring() {
  const joinPage = readFileSync(join(ROOT, "app/portal/[tenantSlug]/join/page.tsx"), "utf8");
  const donatePage = readFileSync(join(ROOT, "app/portal/[tenantSlug]/donate/page.tsx"), "utf8");
  const memberships = readFileSync(join(ROOT, "lib/actions/public-memberships.ts"), "utf8");
  const donations = readFileSync(join(ROOT, "lib/actions/public-donations.ts"), "utf8");
  const webhooks = readFileSync(join(ROOT, "lib/payments/stripe-webhooks.ts"), "utf8");
  const profile = readFileSync(join(ROOT, "app/dashboard/members/[contactId]/page.tsx"), "utf8");

  assert(joinPage.includes("AutoRenewField"), "join page must offer auto-renew");
  assert(joinPage.includes("autoRenew"), "join checkout must pass autoRenew");
  assert(donatePage.includes("RecurringDonationField"), "donate page must offer monthly giving");
  assert(memberships.includes("createStripeSubscriptionCheckoutSession"), "membership checkout supports subscriptions");
  assert(donations.includes("createStripeSubscriptionCheckoutSession"), "donation checkout supports subscriptions");
  assert(webhooks.includes("invoice.paid"), "webhooks must handle invoice.paid renewals");
  assert(webhooks.includes("stripeSubscriptionId"), "webhooks must persist subscription id");
  assert(profile.includes("DigitalMembershipCard"), "contact profile must show digital card");
  console.log("PASS subscription static wiring");
}

function main() {
  testIntervalMapping();
  testExpirationExtension();
  testStaticWiring();
  console.log("Subscription checks passed");
}

main();
