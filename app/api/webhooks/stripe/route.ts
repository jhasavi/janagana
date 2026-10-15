import { NextRequest, NextResponse } from "next/server";
import { emitOpsAlert } from "@/lib/ops/alert";
import { processStripeWebhookEvent } from "@/lib/payments/stripe-webhooks";
import {
  stripeConnectWebhookSecret,
  stripeWebhookConfigured,
  stripeWebhookSecret,
  verifyStripeWebhookSignature,
} from "@/lib/payments/stripe";

export const runtime = "nodejs";

/**
 * GET /api/webhooks/stripe — health check (browser visits show 405 without this).
 * Stripe delivers events via POST with stripe-signature header.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "stripe-webhook",
    configured: stripeWebhookConfigured(),
    message: "POST Stripe events here. GET is only a health check.",
  });
}

/**
 * POST /api/webhooks/stripe
 *
 * Stripe is the source of truth for online payments. This route verifies the
 * raw webhook payload, then activates paid memberships/donations and issues receipts.
 *
 * The same URL can serve two Stripe endpoints: the platform endpoint
 * (STRIPE_WEBHOOK_SECRET — checkout, invoices) and the Connect endpoint for
 * events on connected accounts (STRIPE_CONNECT_WEBHOOK_SECRET — account.updated).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = stripeWebhookSecret();

  if (!secret) {
    return NextResponse.json({ error: "Stripe webhook secret is not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  const connectSecret = stripeConnectWebhookSecret();
  const verified =
    verifyStripeWebhookSignature(rawBody, signature, secret) ||
    (Boolean(connectSecret) && verifyStripeWebhookSignature(rawBody, signature, connectSecret));
  if (!verified) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const result = await processStripeWebhookEvent(
    event as {
      id: string;
      type: string;
      account?: string | null;
      data: { object: unknown };
    },
  );

  if (!result.ok) {
    await emitOpsAlert({
      kind: "stripe-webhook",
      message: result.error ?? "Stripe webhook processing failed",
      metadata: { eventType: (event as { type?: string }).type },
    });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ received: true, processed: result.processed, duplicate: result.duplicate });
}
