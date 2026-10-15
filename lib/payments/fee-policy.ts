/**
 * JanaGana never takes a cut of an organization's money. Revenue comes only from
 * an optional, opt-in donation to JanaGana that a donor can add at checkout.
 *
 * Card processing is always paid by the organization (like a card reader at the
 * door): donors and members are charged exactly the price or gift they chose,
 * plus a JanaGana donation only if they explicitly add one.
 */
export const JANAGANA_PLATFORM_FEE_BPS = 0;

/** Estimated Stripe card rate (US cards) used to recover processing on Connect charges. */
export const STRIPE_PROCESSING_PERCENT_BPS = 290;
export const STRIPE_PROCESSING_FIXED_CENTS = 30;

/**
 * With Stripe Connect destination charges, Stripe bills processing fees to the
 * platform account, not the org. The application fee recovers the estimated
 * processing on the org's share so the org — not JanaGana and not the donor —
 * pays the cost of collecting its payments. Processing on the optional JanaGana
 * donation itself is absorbed by JanaGana.
 */
export const PLATFORM_RECOVERS_PROCESSING_FEES = true;

/** Suggested amounts for the optional "support JanaGana" donation. */
export const PLATFORM_TIP_PRESET_CENTS = [200, 500] as const;
export type PlatformTipChoice = "0" | "200" | "500" | "custom";
export const PLATFORM_TIP_CHOICES: readonly PlatformTipChoice[] = ["0", "200", "500", "custom"];
/** Opt-in only: nothing is added unless the donor picks an amount. */
export const DEFAULT_PLATFORM_TIP_CHOICE: PlatformTipChoice = "0";
export const MAX_PLATFORM_TIP_CENTS = 100_000;

export function calculatePlatformFeeCents(amountCents: number) {
  return Math.round((amountCents * JANAGANA_PLATFORM_FEE_BPS) / 10_000);
}

export function platformFeeLabel() {
  return JANAGANA_PLATFORM_FEE_BPS === 0 ? "No JanaGana platform fee" : `${JANAGANA_PLATFORM_FEE_BPS / 100}% JanaGana platform fee`;
}

export function paymentFeeDisclosure() {
  return `${platformFeeLabel()}. You pay only the amount shown — card processing is covered by the organization.`;
}

export function estimateProcessingFeeCents(amountCents: number) {
  if (amountCents <= 0) return 0;
  return Math.ceil((amountCents * STRIPE_PROCESSING_PERCENT_BPS) / 10_000 + STRIPE_PROCESSING_FIXED_CENTS);
}

/** Processing JanaGana recovers from the org's share of a Connect charge. Never exceeds that share. */
export function processingRecoveryCents(orgAmountCents: number) {
  if (!PLATFORM_RECOVERS_PROCESSING_FEES || orgAmountCents <= 0) return 0;
  const estimate = Math.round(
    (orgAmountCents * STRIPE_PROCESSING_PERCENT_BPS) / 10_000 + STRIPE_PROCESSING_FIXED_CENTS,
  );
  return Math.min(estimate, orgAmountCents);
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
  if (input.baseCents <= 0) return 0;
  const tip =
    input.choice === "custom"
      ? Math.max(0, Math.round(input.customCents ?? 0))
      : Math.max(0, Number(input.choice) || 0);
  return Math.min(tip, MAX_PLATFORM_TIP_CENTS);
}

/**
 * - orgAmountCents: the org's share, recorded as PaymentRecord.amountCents (exactly the price/gift chosen)
 * - totalCents: what the donor is charged (org share + optional JanaGana donation)
 * - applicationFeeCents: what JanaGana keeps via Stripe Connect (JanaGana donation + processing recovery)
 */
export function calculateCheckoutAmount(input: { baseCents: number; platformTipCents?: number }) {
  const orgAmountCents = Math.max(0, input.baseCents);
  const platformTipCents = orgAmountCents === 0 ? 0 : Math.max(0, Math.round(input.platformTipCents ?? 0));
  const recoveryCents = processingRecoveryCents(orgAmountCents);

  return {
    baseCents: orgAmountCents,
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
