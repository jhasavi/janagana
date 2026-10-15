#!/usr/bin/env tsx
/**
 * Fee policy + checkout amount tests (donor-cover vs Zeffy).
 *
 *   npm run test:fee-policy
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  applicationFeePercent,
  calculateCheckoutAmount,
  calculatePlatformTipCents,
  dollarsToCents,
  estimateProcessingFeeCents,
  JANAGANA_PLATFORM_FEE_BPS,
  MAX_PLATFORM_TIP_CENTS,
  parsePlatformTipChoice,
  STRIPE_PROCESSING_FIXED_CENTS,
  STRIPE_PROCESSING_PERCENT_BPS,
} from "@/lib/payments/fee-policy";
import { checkoutAmountsForRouting } from "@/lib/payments/tenant-checkout";

const ROOT = process.cwd();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function testFeeMath() {
  assert(JANAGANA_PLATFORM_FEE_BPS === 0, "platform fee must be 0 bps for nonprofit pitch");

  const noCover = calculateCheckoutAmount({ baseCents: 5000, coverProcessingFee: false });
  assert(noCover.totalCents === 5000, "without cover, total equals base");
  assert(noCover.processingFeeCents === 0, "without cover, no processing add-on");

  const withCover = calculateCheckoutAmount({ baseCents: 5000, coverProcessingFee: true });
  assert(withCover.totalCents > 5000, "with cover, total must exceed base");
  assert(withCover.processingFeeCents === withCover.totalCents - 5000, "processing fee is delta");

  const fee = estimateProcessingFeeCents(10000);
  assert(fee > 0, "processing estimate must be positive for $100");
  console.log("PASS fee math");
}

/** Actual Stripe fee on a charge of `cents` at the modeled card rate. */
function stripeFee(cents: number) {
  return Math.round((cents * STRIPE_PROCESSING_PERCENT_BPS) / 10_000) + STRIPE_PROCESSING_FIXED_CENTS;
}

function testTipMath() {
  assert(calculatePlatformTipCents({ baseCents: 5000, choice: "0" }) === 0, "no-tip choice is 0");
  assert(calculatePlatformTipCents({ baseCents: 5000, choice: "10" }) === 500, "10% of $50 is $5");
  assert(calculatePlatformTipCents({ baseCents: 5000, choice: "15" }) === 750, "15% of $50 is $7.50");
  assert(calculatePlatformTipCents({ baseCents: 3333, choice: "15" }) === 500, "15% rounds to nearest cent");
  assert(calculatePlatformTipCents({ baseCents: 5000, choice: "custom", customCents: 1234 }) === 1234, "custom tip honored");
  assert(calculatePlatformTipCents({ baseCents: 5000, choice: "custom", customCents: -5 }) === 0, "negative custom tip clamps to 0");
  assert(
    calculatePlatformTipCents({ baseCents: 5000, choice: "custom", customCents: 10_000_000 }) === MAX_PLATFORM_TIP_CENTS,
    "custom tip is capped",
  );
  assert(calculatePlatformTipCents({ baseCents: 0, choice: "15" }) === 0, "no tip on free items");
  assert(parsePlatformTipChoice("15") === "15" && parsePlatformTipChoice("99") === "0", "tip choice parsing whitelists options");
  assert(parsePlatformTipChoice(null) === "0", "missing tip choice means no tip");
  assert(dollarsToCents("7.50") === 750 && dollarsToCents("abc") === 0 && dollarsToCents("-3") === 0, "dollars parsing");

  // Tip never reduces the org's share; it is purely additive.
  const tipped = calculateCheckoutAmount({ baseCents: 5000, coverProcessingFee: false, platformTipCents: 500 });
  assert(tipped.orgAmountCents === 5000, "tip does not change org share");
  assert(tipped.totalCents === 5500, "donor is charged org share + tip");
  assert(tipped.platformTipCents === 500, "tip recorded");
  assert(tipped.applicationFeeCents === 500 + tipped.processingRecoveryCents, "app fee = tip + processing recovery");
  assert(tipped.processingRecoveryCents === stripeFee(5000), "recovery = estimated Stripe fee on org share");
  // Org nets base minus processing, exactly as before Connect.
  assert(tipped.totalCents - tipped.applicationFeeCents === 5000 - stripeFee(5000), "org net = base - processing");

  // Donor covers processing + tips: org nets at least its full intended amount.
  for (const base of [100, 1000, 2500, 5000, 12345, 100000, 500000]) {
    const both = calculateCheckoutAmount({ baseCents: base, coverProcessingFee: true, platformTipCents: Math.round(base * 0.15) });
    const orgNet = both.totalCents - both.applicationFeeCents;
    assert(orgNet >= base, `org nets >= base when donor covers fees (base ${base}, net ${orgNet})`);
    assert(orgNet - base <= 1, `cover gross-up is tight (base ${base}, net ${orgNet})`);
    // Platform's share covers its Stripe bill on the org portion; tip processing is JanaGana's cost.
    assert(both.applicationFeeCents - both.platformTipCents <= stripeFee(both.orgAmountCents), "recovery never exceeds estimated fee");
  }

  const noTip = calculateCheckoutAmount({ baseCents: 5000, coverProcessingFee: false });
  assert(noTip.platformTipCents === 0 && noTip.totalCents === 5000, "no tip by default");

  assert(applicationFeePercent({ applicationFeeCents: 0, totalCents: 5000 }) === 0, "no fee percent without fee");
  assert(applicationFeePercent({ applicationFeeCents: 1000, totalCents: 4000 }) === 25, "fee percent math");
  assert(applicationFeePercent({ applicationFeeCents: 1, totalCents: 3 }) === 33.33, "fee percent has 2 decimals");

  // Legacy (pilot) charges and blocked tenants never take a tip or application fee.
  const legacy = checkoutAmountsForRouting({
    routing: { mode: "legacy_platform", tipsEnabled: false },
    baseCents: 5000,
    coverProcessingFee: false,
    platformTipChoice: "15",
  });
  assert(legacy.platformTipCents === 0 && legacy.applicationFeeCents === 0, "legacy routing has no tip or app fee");
  assert(legacy.totalCents === 5000, "legacy routing charges exactly the org amount");
  const connected = checkoutAmountsForRouting({
    routing: { mode: "connect", destinationAccountId: "acct_test", tipsEnabled: true },
    baseCents: 5000,
    coverProcessingFee: false,
    platformTipChoice: "15",
  });
  assert(connected.platformTipCents === 750 && connected.totalCents === 5750, "connect routing applies tip");
  console.log("PASS tip + application fee math");
}

function testStaticUiWiring() {
  const donatePage = readFileSync(join(ROOT, "app/portal/[tenantSlug]/donate/page.tsx"), "utf8");
  const joinPage = readFileSync(join(ROOT, "app/portal/[tenantSlug]/join/page.tsx"), "utf8");
  const registerPage = readFileSync(join(ROOT, "app/portal/[tenantSlug]/register/[eventSlug]/page.tsx"), "utf8");
  const paymentsPage = readFileSync(join(ROOT, "app/dashboard/payments/page.tsx"), "utf8");

  assert(donatePage.includes("CoverProcessingFeeField"), "donate page must offer donor-cover");
  assert(joinPage.includes("CoverProcessingFeeField"), "join page must offer donor-cover");
  assert(registerPage.includes("CoverProcessingFeeField"), "register page must offer donor-cover for paid events");
  assert(registerPage.includes("checkoutUrl"), "register flow must redirect to Stripe checkout");
  assert(paymentsPage.includes("FilterChip"), "payments page must filter by purpose");
  for (const [name, source] of [["donate", donatePage], ["join", joinPage], ["register", registerPage]] as const) {
    assert(source.includes("PlatformTipField"), `${name} page must offer the optional JanaGana tip`);
  }
  const fundraisePage = readFileSync(join(ROOT, "app/portal/[tenantSlug]/fundraise/[fundraiserSlug]/page.tsx"), "utf8");
  assert(fundraisePage.includes("PlatformTipField"), "P2P fundraiser page must offer the optional tip");
  const tipField = readFileSync(join(ROOT, "components/portal/platform-tip-field.tsx"), "utf8");
  assert(tipField.includes('value="0"') && tipField.includes("No tip"), "tip field must offer an explicit No tip option");
  console.log("PASS fee UI wiring");
}

function main() {
  testFeeMath();
  testTipMath();
  testStaticUiWiring();
  console.log("Fee policy checks passed");
}

main();
