/**
 * JanaGana never takes a cut of an organization's money. Revenue comes only from
 * optional donor tips ("support JanaGana") added on top of the org's amount.
 */
export const JANAGANA_PLATFORM_FEE_BPS = 0;

/** Estimated Stripe card rate for donor-cover math (US cards). */
export const STRIPE_PROCESSING_PERCENT_BPS = 290;
export const STRIPE_PROCESSING_FIXED_CENTS = 30;

/**
 * With Stripe Connect destination charges, Stripe bills processing fees to the
 * platform account, not the org. To keep the economics the same as before
 * (org pays card processing, JanaGana takes nothing), the application fee also
 * recovers the estimated processing fee on the org's portion of the charge.
 * The marginal processing on the tip itself is absorbed by JanaGana.
 */
export const PLATFORM_RECOVERS_PROCESSING_FEES = true;

/** Suggested tip percentages shown at checkout. */
export const PLATFORM_TIP_PERCENT_OPTIONS = [10, 15] as const;
export type PlatformTipChoice = "0" | "10" | "15" | "custom";
export const PLATFORM_TIP_CHOICES: readonly PlatformTipChoice[] = ["0", "10", "15", "custom"];
/** Pre-selected option. Donors can always pick "No tip". */
export const DEFAULT_PLATFORM_TIP_CHOICE: PlatformTipChoice = "10";
export const MAX_PLATFORM_TIP_CENTS = 100_000;

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

/** Processing JanaGana recovers when `orgAmountCents` of a charge belongs to the org. */
export function processingRecoveryCents(input: { orgAmountCents: number; baseCents: number; coverProcessingFee: boolean }) {
  if (!PLATFORM_RECOVERS_PROCESSING_FEES || input.orgAmountCents <= 0) return 0;
  const estimate = Math.round(
    (input.orgAmountCents * STRIPE_PROCESSING_PERCENT_BPS) / 10_000 + STRIPE_PROCESSING_FIXED_CENTS,
  );
  // When the donor covered processing, the org must still net its full intended amount.
  const cap = input.coverProcessingFee ? input.orgAmountCents - input.baseCents : input.orgAmountCents;
  return Math.max(0, Math.min(estimate, cap));
}

export function parsePlatformTipChoice(value: unknown): PlatformTipChoice {
  const raw = String(value ?? "").trim();
  return (PLATFORM_TIP_CHOICES as readonly string[]).includes(raw) ? (raw as PlatformTipChoice) : "0";
}

/** Converts a dollars string from a form ("7.50") to non-negative integer cents. */
export function dollarsToCents(value: unknown) {
  const dollars = Number(String(value ?? "").trim());
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  return Math.round(dollars * 100);
}

export function calculatePlatformTipCents(input: { baseCents: number; choice: PlatformTipChoice; customCents?: number }) {
  const baseCents = Math.max(0, input.baseCents);
  if (baseCents === 0) return 0;
  let tip = 0;
  if (input.choice === "custom") {
    tip = Math.max(0, Math.round(input.customCents ?? 0));
  } else {
    const pct = Number(input.choice);
    tip = Number.isFinite(pct) && pct > 0 ? Math.round((baseCents * pct) / 100) : 0;
  }
  return Math.min(tip, MAX_PLATFORM_TIP_CENTS);
}

/**
 * When a donor/member covers processing, gross up so the org receives `baseCents` net of processor fees.
 * An optional JanaGana tip is added on top and never touches the org's share.
 *
 * - orgAmountCents: the org's share, recorded as PaymentRecord.amountCents (base + donor-covered processing)
 * - totalCents: what the donor is charged (org share + tip)
 * - applicationFeeCents: what JanaGana keeps via Stripe Connect (tip + processing recovery)
 */
export function calculateCheckoutAmount(input: {
  baseCents: number;
  coverProcessingFee: boolean;
  platformTipCents?: number;
}) {
  const baseCents = Math.max(0, input.baseCents);
  const platformTipCents = baseCents === 0 ? 0 : Math.max(0, Math.round(input.platformTipCents ?? 0));
  const coverProcessingFee = input.coverProcessingFee && baseCents > 0;

  const orgAmountCents = coverProcessingFee
    ? Math.ceil((baseCents + STRIPE_PROCESSING_FIXED_CENTS) / (1 - STRIPE_PROCESSING_PERCENT_BPS / 10_000))
    : baseCents;
  const recoveryCents = processingRecoveryCents({ orgAmountCents, baseCents, coverProcessingFee });

  return {
    baseCents,
    processingFeeCents: orgAmountCents - baseCents,
    orgAmountCents,
    platformTipCents,
    processingRecoveryCents: recoveryCents,
    applicationFeeCents: platformTipCents + recoveryCents,
    totalCents: orgAmountCents + platformTipCents,
  };
}

/** Stripe subscription application fees are a percentage (max 2 decimals) of each invoice. */
export function applicationFeePercent(input: { applicationFeeCents: number; totalCents: number }) {
  if (input.totalCents <= 0 || input.applicationFeeCents <= 0) return 0;
  return Math.min(100, Math.round((input.applicationFeeCents / input.totalCents) * 10_000) / 100);
}

export function coverProcessingFeeLabel(baseCents: number) {
  const fee = estimateProcessingFeeCents(baseCents);
  if (fee <= 0) return "Cover card processing fees (optional)";
  return `Cover card processing fees (~$${(fee / 100).toFixed(2)} estimated)`;
}
