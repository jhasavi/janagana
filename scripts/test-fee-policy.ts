#!/usr/bin/env tsx
/**
 * Fee policy + checkout amount tests (donor-cover vs Zeffy).
 *
 *   npm run test:fee-policy
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  calculateCheckoutAmount,
  estimateProcessingFeeCents,
  JANAGANA_PLATFORM_FEE_BPS,
} from "@/lib/payments/fee-policy";

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
  console.log("PASS fee UI wiring");
}

function main() {
  testFeeMath();
  testStaticUiWiring();
  console.log("Fee policy checks passed");
}

main();
