/**
 * Pure refund helpers shared by the dashboard refund action and the
 * charge.refunded webhook. Stripe lookups are injected so tests need no network.
 */

type StripeObject = Record<string, unknown>;
type StripeGetResult = { ok: true; body: StripeObject } | { ok: false; error: string };

export type StripeChargeObject = {
  id: string;
  object: "charge";
  amount?: number;
  amount_refunded?: number;
  refunded?: boolean;
  currency?: string | null;
  payment_intent?: string | { id?: string } | null;
  /** Only present on pre-2025 API versions; renewals store the invoice id as providerRef. */
  invoice?: string | { id?: string } | null;
  metadata?: Record<string, string | undefined> | null;
};

export function isStripeCharge(value: unknown): value is StripeChargeObject {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { object?: unknown }).object === "charge" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

/** Stripe returns either an id string or, when expanded, the object itself. */
function stripeId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

export function isStripeRefundablePayment<T extends { method: string; provider: string | null; providerRef: string | null }>(
  payment: T,
): payment is T & { providerRef: string } {
  return payment.method === "STRIPE" && payment.provider === "stripe" && Boolean(payment.providerRef);
}

export function appendPaymentNote(existing: string | null, line: string) {
  return [existing, line].filter(Boolean).join("\n");
}

// ─── Dashboard refund: PaymentRecord.providerRef → PaymentIntent ─────────────

export type PaymentIntentLookupDeps = {
  retrieveCheckoutSession(sessionId: string): Promise<StripeGetResult>;
  retrieveInvoice(invoiceId: string, options?: { expandPayments?: boolean }): Promise<StripeGetResult>;
};

/** Handles both the legacy `invoice.payment_intent` field and the newer `invoice.payments` list. */
export function paymentIntentIdFromInvoice(invoice: StripeObject): string | null {
  const legacy = stripeId(invoice.payment_intent);
  if (legacy) return legacy;
  const payments = invoice.payments as
    | { data?: Array<{ status?: string; payment?: { payment_intent?: unknown } | null }> }
    | undefined;
  for (const entry of payments?.data ?? []) {
    const paymentIntentId = stripeId(entry.payment?.payment_intent);
    if (paymentIntentId && (!entry.status || entry.status === "paid")) return paymentIntentId;
  }
  return null;
}

/**
 * providerRef is a Checkout Session (cs_) for checkout payments and an invoice
 * (in_) for subscription renewals and sponsor invoices.
 */
export async function resolveStripePaymentIntentId(
  providerRef: string,
  deps: PaymentIntentLookupDeps,
): Promise<{ ok: true; paymentIntentId: string } | { ok: false; error: string }> {
  if (providerRef.startsWith("pi_")) return { ok: true, paymentIntentId: providerRef };

  let invoiceId: string | null = null;
  if (providerRef.startsWith("cs_")) {
    const session = await deps.retrieveCheckoutSession(providerRef);
    if (!session.ok) return { ok: false, error: session.error };
    const paymentIntentId = stripeId(session.body.payment_intent);
    if (paymentIntentId) return { ok: true, paymentIntentId };
    // Subscription-mode Checkout charges through the subscription's first invoice.
    invoiceId = stripeId(session.body.invoice);
    if (!invoiceId) return { ok: false, error: "Stripe Checkout Session has no payment to refund" };
  } else if (providerRef.startsWith("in_")) {
    invoiceId = providerRef;
  } else {
    return { ok: false, error: `Unrecognized Stripe payment reference ${providerRef}` };
  }

  const invoice = await deps.retrieveInvoice(invoiceId);
  if (!invoice.ok) return { ok: false, error: invoice.error };
  let paymentIntentId = paymentIntentIdFromInvoice(invoice.body);
  if (!paymentIntentId) {
    const expanded = await deps.retrieveInvoice(invoiceId, { expandPayments: true });
    if (expanded.ok) paymentIntentId = paymentIntentIdFromInvoice(expanded.body);
  }
  return paymentIntentId
    ? { ok: true, paymentIntentId }
    : { ok: false, error: "Stripe invoice has no PaymentIntent to refund" };
}

// ─── charge.refunded webhook: Charge → PaymentRecord ─────────────────────────

export type ChargePaymentLookup = { paymentRecordIds: string[]; providerRefs: string[] };

/** Candidates readable straight off the event payload, no Stripe calls. */
export function localChargePaymentLookup(charge: StripeChargeObject): ChargePaymentLookup {
  const paymentRecordId = charge.metadata?.paymentRecordId;
  const invoiceId = stripeId(charge.invoice);
  return {
    paymentRecordIds: paymentRecordId ? [paymentRecordId] : [],
    providerRefs: invoiceId ? [invoiceId] : [],
  };
}

export type ChargeLookupDeps = {
  retrievePaymentIntent(paymentIntentId: string): Promise<StripeGetResult>;
  listCheckoutSessionsForPaymentIntent(paymentIntentId: string): Promise<StripeGetResult>;
};

/**
 * Checkout puts paymentRecordId on the PaymentIntent metadata; older payments
 * are found through the Checkout Session that created the PaymentIntent.
 * Returns ok:false only when Stripe itself failed, so the webhook is retried.
 */
export async function remoteChargePaymentLookup(
  charge: StripeChargeObject,
  deps: ChargeLookupDeps,
): Promise<({ ok: true } & ChargePaymentLookup) | { ok: false; error: string }> {
  const paymentIntentId = stripeId(charge.payment_intent);
  if (!paymentIntentId) return { ok: true, paymentRecordIds: [], providerRefs: [] };

  const intent = await deps.retrievePaymentIntent(paymentIntentId);
  if (!intent.ok) return { ok: false, error: intent.error };
  const intentMetadata = intent.body.metadata as Record<string, string | undefined> | null | undefined;
  if (intentMetadata?.paymentRecordId) {
    return { ok: true, paymentRecordIds: [intentMetadata.paymentRecordId], providerRefs: [] };
  }

  const sessions = await deps.listCheckoutSessionsForPaymentIntent(paymentIntentId);
  if (!sessions.ok) return { ok: false, error: sessions.error };
  const session = (sessions.body.data as StripeObject[] | undefined)?.[0];
  const sessionId = stripeId(session?.id);
  if (!session || !sessionId) return { ok: true, paymentRecordIds: [], providerRefs: [] };
  const sessionMetadata = session.metadata as Record<string, string | undefined> | null | undefined;
  const recordId = sessionMetadata?.paymentRecordId ?? stripeId(session.client_reference_id);
  return { ok: true, paymentRecordIds: recordId ? [recordId] : [], providerRefs: [sessionId] };
}

export function chargeIsFullyRefunded(charge: StripeChargeObject) {
  if (charge.refunded === true) return true;
  const amount = charge.amount ?? 0;
  return amount > 0 && (charge.amount_refunded ?? 0) >= amount;
}

export type ChargeRefundPlan = "mark_refunded" | "already_refunded" | "partial_refund" | "status_not_refundable";

export function planChargeRefund(payment: { status: string }, charge: StripeChargeObject): ChargeRefundPlan {
  if (payment.status === "REFUNDED") return "already_refunded";
  if (!chargeIsFullyRefunded(charge)) return "partial_refund";
  if (payment.status !== "PAID" && payment.status !== "PENDING") return "status_not_refundable";
  return "mark_refunded";
}
