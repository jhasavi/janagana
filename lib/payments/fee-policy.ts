export const JANAGANA_PLATFORM_FEE_BPS = 0;

/** Estimated Stripe card rate for donor-cover math (US cards). */
export const STRIPE_PROCESSING_PERCENT_BPS = 290;
export const STRIPE_PROCESSING_FIXED_CENTS = 30;

export function calculatePlatformFeeCents(amountCents: number) {
  return Math.round((amountCents * JANAGANA_PLATFORM_FEE_BPS) / 10_000);
}

export function platformFeeLabel() {
  return JANAGANA_PLATFORM_FEE_BPS === 0 ? "No JanaGana platform fee" : `${JANAGANA_PLATFORM_FEE_BPS / 100}% JanaGana platform fee`;
}

export function paymentFeeDisclosure() {
  return `${platformFeeLabel()}. Card processor fees may still apply.`;
}

export function estimateProcessingFeeCents(baseCents: number) {
  if (baseCents <= 0) return 0;
  return Math.ceil((baseCents * STRIPE_PROCESSING_PERCENT_BPS) / 10_000 + STRIPE_PROCESSING_FIXED_CENTS);
}

/**
 * When a donor/member covers processing, gross up so the org receives `baseCents` net of processor fees.
 */
export function calculateCheckoutAmount(input: { baseCents: number; coverProcessingFee: boolean }) {
  const baseCents = Math.max(0, input.baseCents);
  if (!input.coverProcessingFee || baseCents === 0) {
    return { baseCents, processingFeeCents: 0, totalCents: baseCents };
  }

  const totalCents = Math.ceil(
    (baseCents + STRIPE_PROCESSING_FIXED_CENTS) / (1 - STRIPE_PROCESSING_PERCENT_BPS / 10_000),
  );
  return {
    baseCents,
    processingFeeCents: totalCents - baseCents,
    totalCents,
  };
}

export function coverProcessingFeeLabel(baseCents: number) {
  const fee = estimateProcessingFeeCents(baseCents);
  if (fee <= 0) return "Cover card processing fees (optional)";
  return `Cover card processing fees (~$${(fee / 100).toFixed(2)} estimated)`;
}
