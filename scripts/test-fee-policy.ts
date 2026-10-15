#!/usr/bin/env tsx
/**
 * Fee policy + checkout amount tests: org pays processing, donors pay only what
 * they choose, JanaGana donation is opt-in.
 *
 *   npm run test:fee-policy
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  applicationFeePercent,
  calculateCheckoutAmount,
  calculatePlatformTipCents,
  DEFAULT_PLATFORM_TIP_CHOICE,
  dollarsToCents,
  estimateProcessingFeeCents,
  JANAGANA_PLATFORM_FEE_BPS,
  MAX_PLATFORM_TIP_CENTS,
  parsePlatformTipChoice,
  processingRecoveryCents,
  STRIPE_PROCESSING_FIXED_CENTS,
  STRIPE_PROCESSING_PERCENT_BPS,
} from "@/lib/payments/fee-policy";
import { checkoutAmountsForRouting } from "@/lib/payments/tenant-checkout";

const ROOT = process.cwd();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

/** Actual Stripe fee on a charge of `cents` at the modeled card rate. */
function stripeFee(cents: number) {
  return Math.round((cents * STRIPE_PROCESSING_PERCENT_BPS) / 10_000) + STRIPE_PROCESSING_FIXED_CENTS;
}

function testFeeMath() {
  assert(JANAGANA_PLATFORM_FEE_BPS === 0, "platform fee must be 0 bps for nonprofit pitch");

  // Donors are charged exactly the price/gift; the org bears processing.
  for (const base of [100, 1000, 2500, 5000, 12345, 100000, 500000]) {
    const amounts = calculateCheckoutAmount({ baseCents: base });
    assert(amounts.totalCents === base, `donor pays exactly the base amount (${base})`);
    assert(amounts.orgAmountCents === base, "org share recorded at the full price/gift");
    assert(amounts.processingRecoveryCents === Math.min(stripeFee(base), base), "org pays estimated processing");
    assert(amounts.totalCents - amounts.applicationFeeCents === base - amounts.processingRecoveryCents, "org net = base - processing");
  }
  assert(processingRecoveryCents(0) === 0, "no recovery on free items");
  assert(processingRecoveryCents(20) === 20, "recovery never exceeds the org share");
  assert(estimateProcessingFeeCents(10000) > 0, "processing estimate must be positive for $100");
  console.log("PASS fee math");
}

function testTipMath() {
  assert(DEFAULT_PLATFORM_TIP_CHOICE === "0", "JanaGana donation must be opt-in (default none)");
  assert(calculatePlatformTipCents({ baseCents: 5000, choice: "0" }) === 0, "no-thanks choice is 0");
  assert(calculatePlatformTipCents({ baseCents: 5000, choice: "200" }) === 200, "$2 preset");
  assert(calculatePlatformTipCents({ baseCents: 100000, choice: "500" }) === 500, "$5 preset is fixed, not a percent");
  assert(calculatePlatformTipCents({ baseCents: 5000, choice: "custom", customCents: 1234 }) === 1234, "custom amount honored");
  assert(calculatePlatformTipCents({ baseCents: 5000, choice: "custom", customCents: -5 }) === 0, "negative custom clamps to 0");
  assert(
    calculatePlatformTipCents({ baseCents: 5000, choice: "custom", customCents: 10_000_000 }) === MAX_PLATFORM_TIP_CENTS,
    "custom amount is capped",
  );
  assert(calculatePlatformTipCents({ baseCents: 0, choice: "500" }) === 0, "no JanaGana donation on free items");
  assert(parsePlatformTipChoice("500") === "500" && parsePlatformTipChoice("10") === "0", "choice parsing whitelists options");
  assert(parsePlatformTipChoice(null) === "0", "missing choice means no donation");
  assert(dollarsToCents("7.50") === 750 && dollarsToCents("abc") === 0 && dollarsToCents("-3") === 0, "dollars parsing");

  // JanaGana donation is purely additive and never changes the org's share.
  const tipped = calculateCheckoutAmount({ baseCents: 5000, platformTipCents: 500 });
  assert(tipped.orgAmountCents === 5000, "donation does not change org share");
  assert(tipped.totalCents === 5500, "donor is charged org share + their JanaGana donation");
  assert(tipped.applicationFeeCents === 500 + stripeFee(5000), "app fee = JanaGana donation + processing recovery");
  assert(tipped.totalCents - tipped.applicationFeeCents === 5000 - stripeFee(5000), "org net unchanged by donation");

  assert(applicationFeePercent({ applicationFeeCents: 0, totalCents: 5000 }) === 0, "no fee percent without fee");
  assert(applicationFeePercent({ applicationFeeCents: 1000, totalCents: 4000 }) === 25, "fee percent math");
  assert(applicationFeePercent({ applicationFeeCents: 1, totalCents: 3 }) === 33.33, "fee percent has 2 decimals");

  // Legacy (pilot) charges never take a donation or application fee.
  const legacy = checkoutAmountsForRouting({
    routing: { mode: "legacy_platform", tipsEnabled: false },
    baseCents: 5000,
    platformTipChoice: "500",
  });
  assert(legacy.platformTipCents === 0 && legacy.applicationFeeCents === 0, "legacy routing has no donation or app fee");
  assert(legacy.totalCents === 5000, "legacy routing charges exactly the org amount");
  const connected = checkoutAmountsForRouting({
    routing: { mode: "connect", destinationAccountId: "acct_test", tipsEnabled: true },
    baseCents: 5000,
    platformTipChoice: "500",
  });
  assert(connected.platformTipCents === 500 && connected.totalCents === 5500, "connect routing applies opted-in donation");
  const optedOut = checkoutAmountsForRouting({
    routing: { mode: "connect", destinationAccountId: "acct_test", tipsEnabled: true },
    baseCents: 5000,
    platformTipChoice: "0",
  });
  assert(optedOut.totalCents === 5000, "no donation when donor keeps the default");
  console.log("PASS JanaGana donation + application fee math");
}

function testStaticUiWiring() {
  const donatePage = readFileSync(join(ROOT, "app/portal/[tenantSlug]/donate/page.tsx"), "utf8");
  const joinPage = readFileSync(join(ROOT, "app/portal/[tenantSlug]/join/page.tsx"), "utf8");
  const registerPage = readFileSync(join(ROOT, "app/portal/[tenantSlug]/register/[eventSlug]/page.tsx"), "utf8");
  const fundraisePage = readFileSync(join(ROOT, "app/portal/[tenantSlug]/fundraise/[fundraiserSlug]/page.tsx"), "utf8");
  const paymentsPage = readFileSync(join(ROOT, "app/dashboard/payments/page.tsx"), "utf8");
  const donateRoute = readFileSync(join(ROOT, "app/api/public/donate/route.ts"), "utf8");

  assert(registerPage.includes("checkoutUrl"), "register flow must redirect to Stripe checkout");
  assert(paymentsPage.includes("FilterChip"), "payments page must filter by purpose");
  for (const [name, source] of [
    ["donate", donatePage],
    ["join", joinPage],
    ["register", registerPage],
    ["fundraise", fundraisePage],
    ["donate route", donateRoute],
  ] as const) {
    assert(!source.includes("CoverProcessingFee") && !source.includes("coverProcessingFee"), `${name} must not ask donors to cover fees`);
  }
  for (const [name, source] of [["donate", donatePage], ["join", joinPage], ["register", registerPage], ["fundraise", fundraisePage]] as const) {
    assert(source.includes("PlatformTipField"), `${name} page must offer the optional JanaGana donation`);
  }
  const tipField = readFileSync(join(ROOT, "components/portal/platform-tip-field.tsx"), "utf8");
  assert(tipField.includes('value="0"') && tipField.includes("No thanks"), "donation field must offer an explicit No thanks option");
  console.log("PASS fee UI wiring");
}

function main() {
  testFeeMath();
  testTipMath();
  testStaticUiWiring();
  console.log("Fee policy checks passed");
}

main();
