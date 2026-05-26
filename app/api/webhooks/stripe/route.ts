import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler — stub for v3.
 * Payment processing is deferred. This endpoint exists to accept webhooks
 * safely without errors when Stripe is configured.
 */
export async function POST(req: NextRequest) {
  // Stripe webhook processing is deferred to v3.1
  // When implemented, use stripe.webhooks.constructEvent() with the raw body
  // and STRIPE_WEBHOOK_SECRET — never skip signature verification.
  return NextResponse.json({ received: true });
}
