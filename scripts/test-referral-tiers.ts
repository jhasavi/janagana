#!/usr/bin/env tsx
/**
 * Pure unit checks for lib/leads/referral-tiers.ts — no DB, no env required.
 *
 *   npm run test:referral-tiers
 */
import { currentReferralTier, nextReferralTier, referralTierTag } from "@/lib/leads/referral-tiers";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAILED: ${message}`);
}

function main() {
  assert(currentReferralTier(0) === null, "0 conversions should be below the first tier");
  assert(currentReferralTier(2) === null, "2 conversions should still be below the first tier");
  assert(currentReferralTier(3)?.key === "friend", "3 conversions should unlock Financial Friend");
  assert(currentReferralTier(9)?.key === "friend", "9 conversions should still be Financial Friend");
  assert(currentReferralTier(10)?.key === "builder", "10 conversions should unlock Community Builder");
  assert(currentReferralTier(24)?.key === "builder", "24 conversions should still be Community Builder");
  assert(currentReferralTier(25)?.key === "champion", "25 conversions should unlock Movement Maker");
  assert(currentReferralTier(100)?.key === "champion", "100 conversions should stay at the top tier");

  assert(nextReferralTier(0)?.key === "friend", "0 conversions should have Financial Friend as next");
  assert(nextReferralTier(3)?.key === "builder", "3 conversions should have Community Builder as next");
  assert(nextReferralTier(25) === null, "25+ conversions should have no next tier");

  const friend = currentReferralTier(3)!;
  assert(referralTierTag(friend) === "referral-tier-friend", "tag should be derived from the tier key");

  console.log("Referral tier checks passed:");
  console.log(`- tier(0)=none tier(3)=${currentReferralTier(3)?.key} tier(10)=${currentReferralTier(10)?.key} tier(25)=${currentReferralTier(25)?.key}`);
  console.log(`- next(0)=${nextReferralTier(0)?.key} next(25)=${nextReferralTier(25)}`);
}

main();
