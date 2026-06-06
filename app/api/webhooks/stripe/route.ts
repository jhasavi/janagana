import { NextRequest, NextResponse } from "next/server";
import { processStripeWebhookEvent } from "@/lib/payments/stripe-webhooks";
import { stripeWebhookSecret, verifyStripeWebhookSignature } from "@/lib/payments/stripe";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe is the source of truth for online payments. This route verifies the
 * raw webhook payload, then activates paid memberships and issues receipts.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = stripeWebhookSecret();

  if (!secret) {
    return NextResponse.json({ error: "Stripe webhook secret is not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!verifyStripeWebhookSignature(rawBody, signature, secret)) {
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
      data: { object: unknown };
    },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ received: true, processed: result.processed, duplicate: result.duplicate });
}
