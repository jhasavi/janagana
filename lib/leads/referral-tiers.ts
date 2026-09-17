/**
 * Ambassador reward tiers, keyed off an ambassador's total CONVERTED
 * redemptions across every referral code they own (not per-code). Mirrors
 * TPW's "Financial Friend / Community Builder / Movement Maker" concept —
 * see docs/17-REFERRAL-PROGRAM.md — but backed by real conversion counts.
 */

export interface ReferralTier {
  key: string;
  label: string;
  threshold: number;
}

export const REFERRAL_TIERS: ReferralTier[] = [
  { key: "friend", label: "Financial Friend", threshold: 3 },
  { key: "builder", label: "Community Builder", threshold: 10 },
  { key: "champion", label: "Movement Maker", threshold: 25 },
];

/** The highest tier reached, or null if below the first threshold. */
export function currentReferralTier(convertedCount: number): ReferralTier | null {
  let current: ReferralTier | null = null;
  for (const tier of REFERRAL_TIERS) {
    if (convertedCount >= tier.threshold) current = tier;
  }
  return current;
}

/** The next tier to unlock, or null once every tier is reached. */
export function nextReferralTier(convertedCount: number): ReferralTier | null {
  return REFERRAL_TIERS.find((tier) => convertedCount < tier.threshold) ?? null;
}

export function referralTierTag(tier: ReferralTier): string {
  return `referral-tier-${tier.key}`;
}
