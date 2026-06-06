export const JANAGANA_PLATFORM_FEE_BPS = 0;

export function calculatePlatformFeeCents(amountCents: number) {
  return Math.round((amountCents * JANAGANA_PLATFORM_FEE_BPS) / 10_000);
}

export function platformFeeLabel() {
  return JANAGANA_PLATFORM_FEE_BPS === 0 ? "No JanaGana platform fee" : `${JANAGANA_PLATFORM_FEE_BPS / 100}% JanaGana platform fee`;
}

export function paymentFeeDisclosure() {
  return `${platformFeeLabel()}. Card processor fees may still apply.`;
}
