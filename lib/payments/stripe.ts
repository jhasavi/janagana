import crypto from "node:crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SECONDS = 300;

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
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

export async function createStripeCheckoutSession(input: {
  amountCents: number;
  currency?: string;
  customerEmail: string;
  productName: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  metadata: Record<string, string>;
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
  append(params, "payment_intent_data[metadata][paymentRecordId]", input.clientReferenceId);
  appendCheckoutMetadata(params, input.metadata);

  return postStripeCheckout(params);
}

export async function createStripeSubscriptionCheckoutSession(input: {
  unitAmountCents: number;
  currency?: string;
  interval: StripeRecurringInterval;
  customerEmail: string;
  productName: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  metadata: Record<string, string>;
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
  appendCheckoutMetadata(params, input.metadata, { subscription: true });

  return postStripeCheckout(params);
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

async function postStripe(path: string, params: URLSearchParams) {
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    return { ok: false as const, error: "Stripe is not configured" };
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const body = (await response.json()) as Record<string, unknown> & {
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !body.id) {
    return {
      ok: false as const,
      error: body.error?.message ?? `Stripe request to ${path} failed`,
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
}) {
  const params = new URLSearchParams();
  append(params, "customer", input.customerId);
  append(params, "collection_method", "send_invoice");
  append(params, "days_until_due", input.daysUntilDue ?? 30);
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
