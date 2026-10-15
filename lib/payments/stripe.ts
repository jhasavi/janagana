import crypto from "node:crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SECONDS = 300;

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

/** Signing secret for the Connect webhook endpoint ("Events on connected accounts"), e.g. account.updated. */
export function stripeConnectWebhookSecret() {
  return process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim() || "";
}

export function stripeCheckoutConfigured() {
  return Boolean(stripeSecretKey());
}

export function stripeWebhookConfigured() {
  return Boolean(stripeWebhookSecret());
}

export type StripeRecurringInterval = "month" | "year";

export function membershipIntervalToStripe(
  interval: "MONTHLY" | "ANNUAL" | "ONE_TIME",
): StripeRecurringInterval | null {
  if (interval === "MONTHLY") return "month";
  if (interval === "ANNUAL") return "year";
  return null;
}

function append(params: URLSearchParams, key: string, value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return;
  params.append(key, String(value));
}

async function postStripeCheckout(params: URLSearchParams) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    return { ok: false as const, error: "Stripe is not configured" };
  }

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const body = (await response.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!response.ok || !body.id || !body.url) {
    return {
      ok: false as const,
      error: body.error?.message ?? "Failed to create Stripe Checkout session",
    };
  }

  return {
    ok: true as const,
    sessionId: body.id,
    url: body.url,
  };
}

function appendCheckoutMetadata(
  params: URLSearchParams,
  metadata: Record<string, string>,
  options?: { subscription?: boolean },
) {
  for (const [key, value] of Object.entries(metadata)) {
    append(params, `metadata[${key}]`, value);
    if (options?.subscription) {
      append(params, `subscription_data[metadata][${key}]`, value);
    } else {
      append(params, `payment_intent_data[metadata][${key}]`, value);
    }
  }
}

export const PLATFORM_TIP_LINE_ITEM_NAME = "Optional tip to support JanaGana (free software for this organization)";

function appendPlatformTipLineItem(
  params: URLSearchParams,
  input: { platformTipCents?: number; currency?: string; interval?: StripeRecurringInterval },
) {
  if (!input.platformTipCents || input.platformTipCents <= 0) return;
  append(params, "line_items[1][quantity]", 1);
  append(params, "line_items[1][price_data][currency]", (input.currency ?? "USD").toLowerCase());
  append(params, "line_items[1][price_data][unit_amount]", input.platformTipCents);
  append(params, "line_items[1][price_data][product_data][name]", PLATFORM_TIP_LINE_ITEM_NAME);
  if (input.interval) {
    append(params, "line_items[1][price_data][recurring][interval]", input.interval);
  }
}

/**
 * Destination charge: the payment settles on the tenant's connected account and
 * JanaGana keeps `applicationFeeCents` (tip + processing recovery).
 */
export type StripeConnectDestination = {
  destinationAccountId: string;
  applicationFeeCents: number;
};

export function buildStripeCheckoutSessionParams(input: {
  amountCents: number;
  platformTipCents?: number;
  currency?: string;
  customerEmail: string;
  productName: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  metadata: Record<string, string>;
  connect?: StripeConnectDestination | null;
}) {
  const params = new URLSearchParams();
  append(params, "mode", "payment");
  append(params, "success_url", input.successUrl);
  append(params, "cancel_url", input.cancelUrl);
  append(params, "customer_email", input.customerEmail);
  append(params, "client_reference_id", input.clientReferenceId);
  append(params, "line_items[0][quantity]", 1);
  append(params, "line_items[0][price_data][currency]", (input.currency ?? "USD").toLowerCase());
  append(params, "line_items[0][price_data][unit_amount]", input.amountCents);
  append(params, "line_items[0][price_data][product_data][name]", input.productName);
  appendPlatformTipLineItem(params, { platformTipCents: input.platformTipCents, currency: input.currency });
  append(params, "payment_intent_data[metadata][paymentRecordId]", input.clientReferenceId);
  if (input.connect) {
    append(params, "payment_intent_data[transfer_data][destination]", input.connect.destinationAccountId);
    if (input.connect.applicationFeeCents > 0) {
      append(params, "payment_intent_data[application_fee_amount]", input.connect.applicationFeeCents);
    }
  }
  appendCheckoutMetadata(params, input.metadata);
  return params;
}

export async function createStripeCheckoutSession(input: Parameters<typeof buildStripeCheckoutSessionParams>[0]) {
  return postStripeCheckout(buildStripeCheckoutSessionParams(input));
}

export function buildStripeSubscriptionCheckoutSessionParams(input: {
  unitAmountCents: number;
  platformTipCents?: number;
  currency?: string;
  interval: StripeRecurringInterval;
  customerEmail: string;
  productName: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  metadata: Record<string, string>;
  /** Subscriptions take the application fee as a percent of every invoice. */
  connect?: { destinationAccountId: string; applicationFeePercent: number } | null;
}) {
  const params = new URLSearchParams();
  append(params, "mode", "subscription");
  append(params, "success_url", input.successUrl);
  append(params, "cancel_url", input.cancelUrl);
  append(params, "customer_email", input.customerEmail);
  append(params, "client_reference_id", input.clientReferenceId);
  append(params, "line_items[0][quantity]", 1);
  append(params, "line_items[0][price_data][currency]", (input.currency ?? "USD").toLowerCase());
  append(params, "line_items[0][price_data][unit_amount]", input.unitAmountCents);
  append(params, "line_items[0][price_data][product_data][name]", input.productName);
  append(params, "line_items[0][price_data][recurring][interval]", input.interval);
  appendPlatformTipLineItem(params, {
    platformTipCents: input.platformTipCents,
    currency: input.currency,
    interval: input.interval,
  });
  if (input.connect) {
    append(params, "subscription_data[transfer_data][destination]", input.connect.destinationAccountId);
    if (input.connect.applicationFeePercent > 0) {
      append(params, "subscription_data[application_fee_percent]", input.connect.applicationFeePercent);
    }
  }
  appendCheckoutMetadata(params, input.metadata, { subscription: true });
  return params;
}

export async function createStripeSubscriptionCheckoutSession(
  input: Parameters<typeof buildStripeSubscriptionCheckoutSessionParams>[0],
) {
  return postStripeCheckout(buildStripeSubscriptionCheckoutSessionParams(input));
}

export async function createBillingPortalSession(input: { customerId: string; returnUrl: string }) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    return { ok: false as const, error: "Stripe is not configured" };
  }

  const params = new URLSearchParams();
  append(params, "customer", input.customerId);
  append(params, "return_url", input.returnUrl);

  const response = await fetch(`${STRIPE_API_BASE}/billing_portal/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const body = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !body.url) {
    return { ok: false as const, error: body.error?.message ?? "Failed to create billing portal session" };
  }

  return { ok: true as const, url: body.url };
}

async function postStripe(path: string, params: URLSearchParams, options?: { idempotencyKey?: string }) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    return { ok: false as const, error: "Stripe is not configured", code: null };
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body: params,
  });

  const body = (await response.json()) as Record<string, unknown> & {
    id?: string;
    error?: { message?: string; code?: string };
  };

  if (!response.ok || !body.id) {
    return {
      ok: false as const,
      error: body.error?.message ?? `Stripe request to ${path} failed`,
      code: body.error?.code ?? null,
    };
  }

  return { ok: true as const, body };
}

function appendMetadata(params: URLSearchParams, metadata?: Record<string, string>) {
  for (const [key, value] of Object.entries(metadata ?? {})) {
    append(params, `metadata[${key}]`, value);
  }
}

export async function createStripeCustomer(input: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}) {
  const params = new URLSearchParams();
  append(params, "email", input.email);
  append(params, "name", input.name);
  appendMetadata(params, input.metadata);

  const result = await postStripe("/customers", params);
  if (!result.ok) return result;
  return { ok: true as const, customerId: String(result.body.id) };
}

export async function createStripeInvoiceItem(input: {
  customerId: string;
  amountCents: number;
  currency?: string;
  description: string;
  metadata?: Record<string, string>;
}) {
  const params = new URLSearchParams();
  append(params, "customer", input.customerId);
  append(params, "amount", input.amountCents);
  append(params, "currency", (input.currency ?? "USD").toLowerCase());
  append(params, "description", input.description);
  appendMetadata(params, input.metadata);

  const result = await postStripe("/invoiceitems", params);
  if (!result.ok) return result;
  return { ok: true as const, invoiceItemId: String(result.body.id) };
}

export async function createStripeInvoice(input: {
  customerId: string;
  daysUntilDue?: number;
  metadata?: Record<string, string>;
  connect?: StripeConnectDestination | null;
}) {
  const params = new URLSearchParams();
  append(params, "customer", input.customerId);
  append(params, "collection_method", "send_invoice");
  append(params, "days_until_due", input.daysUntilDue ?? 30);
  if (input.connect) {
    append(params, "transfer_data[destination]", input.connect.destinationAccountId);
    if (input.connect.applicationFeeCents > 0) {
      append(params, "application_fee_amount", input.connect.applicationFeeCents);
    }
  }
  appendMetadata(params, input.metadata);

  const result = await postStripe("/invoices", params);
  if (!result.ok) return result;
  return { ok: true as const, invoiceId: String(result.body.id) };
}

export async function finalizeAndSendStripeInvoice(invoiceId: string) {
  const finalizeResult = await postStripe(`/invoices/${invoiceId}/finalize`, new URLSearchParams());
  if (!finalizeResult.ok) return finalizeResult;

  const sendResult = await postStripe(`/invoices/${invoiceId}/send`, new URLSearchParams());
  if (!sendResult.ok) return sendResult;

  const hostedInvoiceUrl = sendResult.body.hosted_invoice_url ?? finalizeResult.body.hosted_invoice_url;
  return {
    ok: true as const,
    hostedInvoiceUrl: typeof hostedInvoiceUrl === "string" ? hostedInvoiceUrl : null,
  };
}

export async function voidStripeInvoice(invoiceId: string) {
  const result = await postStripe(`/invoices/${invoiceId}/void`, new URLSearchParams());
  if (!result.ok) return result;
  return { ok: true as const };
}

// ─── Stripe Connect (Express) ────────────────────────────────────────────────

export type StripeConnectAccount = {
  id: string;
  object?: "account";
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  capabilities?: Record<string, string | undefined> | null;
  requirements?: { currently_due?: string[] | null; disabled_reason?: string | null } | null;
  metadata?: Record<string, string | undefined> | null;
};

async function getStripe(path: string) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    return { ok: false as const, error: "Stripe is not configured" };
  }
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = (await response.json()) as Record<string, unknown> & { id?: string; error?: { message?: string } };
  if (!response.ok || (!body.id && body.object !== "list")) {
    return { ok: false as const, error: body.error?.message ?? `Stripe request to ${path} failed` };
  }
  return { ok: true as const, body };
}

export async function createStripeExpressAccount(input: {
  email?: string | null;
  businessName: string;
  tenantId: string;
  tenantSlug: string;
}) {
  const params = new URLSearchParams();
  append(params, "type", "express");
  append(params, "country", "US");
  append(params, "email", input.email ?? undefined);
  append(params, "business_profile[name]", input.businessName);
  append(params, "capabilities[card_payments][requested]", true);
  append(params, "capabilities[transfers][requested]", true);
  append(params, "metadata[tenantId]", input.tenantId);
  append(params, "metadata[tenantSlug]", input.tenantSlug);

  const result = await postStripe("/accounts", params);
  if (!result.ok) return result;
  return { ok: true as const, account: result.body as unknown as StripeConnectAccount };
}

export async function retrieveStripeConnectAccount(accountId: string) {
  const result = await getStripe(`/accounts/${encodeURIComponent(accountId)}`);
  if (!result.ok) return result;
  return { ok: true as const, account: result.body as unknown as StripeConnectAccount };
}

export async function createStripeAccountLink(input: { accountId: string; refreshUrl: string; returnUrl: string }) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    return { ok: false as const, error: "Stripe is not configured" };
  }
  const params = new URLSearchParams();
  append(params, "account", input.accountId);
  append(params, "refresh_url", input.refreshUrl);
  append(params, "return_url", input.returnUrl);
  append(params, "type", "account_onboarding");

  const response = await fetch(`${STRIPE_API_BASE}/account_links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const body = (await response.json()) as { url?: string; error?: { message?: string } };
  if (!response.ok || !body.url) {
    return { ok: false as const, error: body.error?.message ?? "Failed to create Stripe onboarding link" };
  }
  return { ok: true as const, url: body.url };
}

export async function createStripeExpressLoginLink(accountId: string) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    return { ok: false as const, error: "Stripe is not configured" };
  }
  const response = await fetch(`${STRIPE_API_BASE}/accounts/${encodeURIComponent(accountId)}/login_links`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = (await response.json()) as { url?: string; error?: { message?: string } };
  if (!response.ok || !body.url) {
    return { ok: false as const, error: body.error?.message ?? "Failed to open Stripe Express dashboard" };
  }
  return { ok: true as const, url: body.url };
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

/**
 * Full refund of a PaymentIntent. For a destination charge (`connected`), Stripe
 * pulls the transferred amount back from the org's connected account and returns
 * JanaGana's application fee (tip + processing recovery), so the donor gets the
 * whole charge back and neither side keeps money. Legacy platform charges get a
 * plain refund.
 */
export function buildStripeRefundParams(input: {
  paymentIntentId: string;
  connected: boolean;
  paymentRecordId: string;
  tenantId: string;
}) {
  const params = new URLSearchParams();
  append(params, "payment_intent", input.paymentIntentId);
  if (input.connected) {
    append(params, "reverse_transfer", true);
    append(params, "refund_application_fee", true);
  }
  append(params, "metadata[paymentRecordId]", input.paymentRecordId);
  append(params, "metadata[tenantId]", input.tenantId);
  return params;
}

/** Keyed per payment so a double-submitted dashboard form cannot refund twice. */
export function stripeRefundIdempotencyKey(paymentRecordId: string) {
  return `janagana-refund-${paymentRecordId}`;
}

export async function createStripeRefund(input: Parameters<typeof buildStripeRefundParams>[0]) {
  const result = await postStripe("/refunds", buildStripeRefundParams(input), {
    idempotencyKey: stripeRefundIdempotencyKey(input.paymentRecordId),
  });
  if (!result.ok) return result;
  return {
    ok: true as const,
    refundId: String(result.body.id),
    status: typeof result.body.status === "string" ? result.body.status : null,
  };
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  return getStripe(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export async function retrieveStripeInvoice(invoiceId: string, options?: { expandPayments?: boolean }) {
  const query = options?.expandPayments ? "?expand[]=payments" : "";
  return getStripe(`/invoices/${encodeURIComponent(invoiceId)}${query}`);
}

export async function retrieveStripePaymentIntent(paymentIntentId: string) {
  return getStripe(`/payment_intents/${encodeURIComponent(paymentIntentId)}`);
}

export async function listStripeCheckoutSessionsForPaymentIntent(paymentIntentId: string) {
  return getStripe(`/checkout/sessions?payment_intent=${encodeURIComponent(paymentIntentId)}&limit=1`);
}

export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader || !secret) return false;

  const parts = new Map<string, string[]>();
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;
    const values = parts.get(key) ?? [];
    values.push(value);
    parts.set(key, values);
  }

  const timestamp = parts.get("t")?.[0];
  const signatures = parts.get("v1") ?? [];
  if (!timestamp || signatures.length === 0) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const age = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (age > WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return signatures.some((signature) => {
    const actualBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    return (
      actualBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    );
  });
}
