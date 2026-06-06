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

function append(params: URLSearchParams, key: string, value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return;
  params.append(key, String(value));
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
  const secretKey = stripeSecretKey();
  if (!secretKey) {
    return { ok: false as const, error: "Stripe is not configured" };
  }

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

  for (const [key, value] of Object.entries(input.metadata)) {
    append(params, `metadata[${key}]`, value);
    append(params, `payment_intent_data[metadata][${key}]`, value);
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
