#!/usr/bin/env tsx
/**
 * Stripe refund params, PaymentIntent resolution, charge → payment lookup,
 * refund planning, and dashboard guard wiring. No DB; Stripe is stubbed.
 *
 *   npm run test:stripe-refunds
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  buildStripeRefundParams,
  createStripeRefund,
  stripeRefundIdempotencyKey,
} from "@/lib/payments/stripe";
import {
  chargeIsFullyRefunded,
  isStripeCharge,
  isStripeRefundablePayment,
  localChargePaymentLookup,
  paymentIntentIdFromInvoice,
  planChargeRefund,
  remoteChargePaymentLookup,
  resolveStripePaymentIntentId,
  type StripeChargeObject,
} from "@/lib/payments/refunds";

const ROOT = process.cwd();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

type Body = Record<string, unknown>;
const ok = (body: Body) => Promise.resolve({ ok: true as const, body });
const fail = (error: string) => Promise.resolve({ ok: false as const, error });

function testRefundParams() {
  const connect = buildStripeRefundParams({
    paymentIntentId: "pi_1",
    connected: true,
    paymentRecordId: "pay_1",
    tenantId: "ten_1",
  });
  assert(connect.get("payment_intent") === "pi_1", "refund targets the PaymentIntent");
  assert(connect.get("reverse_transfer") === "true", "destination charge refund reverses the transfer");
  assert(connect.get("refund_application_fee") === "true", "destination charge refund returns JanaGana's fee");
  assert(!connect.has("amount"), "dashboard refunds are full refunds (tip included)");
  assert(connect.get("metadata[paymentRecordId]") === "pay_1", "refund carries the payment record id");
  assert(connect.get("metadata[tenantId]") === "ten_1", "refund carries the tenant id");

  const legacy = buildStripeRefundParams({
    paymentIntentId: "pi_2",
    connected: false,
    paymentRecordId: "pay_2",
    tenantId: "ten_1",
  });
  assert(legacy.get("payment_intent") === "pi_2", "legacy refund targets the PaymentIntent");
  assert(!legacy.has("reverse_transfer") && !legacy.has("refund_application_fee"), "legacy platform charge gets a plain refund");

  assert(stripeRefundIdempotencyKey("pay_1") === stripeRefundIdempotencyKey("pay_1"), "idempotency key is stable per payment");
  assert(stripeRefundIdempotencyKey("pay_1") !== stripeRefundIdempotencyKey("pay_2"), "idempotency key differs per payment");
  console.log("PASS refund params");
}

async function testCreateRefundRequest() {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_refunds";
  const calls: { url: string; init: RequestInit }[] = [];
  let reply: { status: number; body: Body } = { status: 200, body: { id: "re_1", status: "succeeded" } };
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  }) as typeof fetch;
  try {
    const result = await createStripeRefund({ paymentIntentId: "pi_1", connected: true, paymentRecordId: "pay_1", tenantId: "t" });
    assert(result.ok && result.refundId === "re_1", "refund id returned");
    assert(calls[0].url === "https://api.stripe.com/v1/refunds", "POSTs /v1/refunds");
    assert(calls[0].init.method === "POST", "refund is a POST");
    const headers = calls[0].init.headers as Record<string, string>;
    assert(headers["Idempotency-Key"] === "janagana-refund-pay_1", "refund sends the per-payment idempotency key");
    const sent = calls[0].init.body as URLSearchParams;
    assert(sent.get("reverse_transfer") === "true", "connect refund body reverses transfer");

    reply = { status: 400, body: { error: { message: "Charge already refunded", code: "charge_already_refunded" } } };
    const already = await createStripeRefund({ paymentIntentId: "pi_1", connected: true, paymentRecordId: "pay_1", tenantId: "t" });
    assert(!already.ok && already.code === "charge_already_refunded", "Stripe error code is surfaced");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalKey;
  }
  console.log("PASS refund request");
}

async function testPaymentIntentResolution() {
  const seen: string[] = [];
  const deps = {
    retrieveCheckoutSession: (id: string) => {
      seen.push(id);
      if (id === "cs_pay") return ok({ id, payment_intent: "pi_from_session" });
      if (id === "cs_sub") return ok({ id, payment_intent: null, invoice: "in_first" });
      if (id === "cs_empty") return ok({ id, payment_intent: null, invoice: null });
      return fail("No such checkout.session");
    },
    retrieveInvoice: (id: string, options?: { expandPayments?: boolean }) => {
      seen.push(`${id}${options?.expandPayments ? "+payments" : ""}`);
      if (id === "in_first" || id === "in_legacy") return ok({ id, payment_intent: "pi_from_invoice" });
      if (id === "in_basil" && options?.expandPayments) {
        return ok({ id, payments: { data: [{ status: "paid", payment: { type: "payment_intent", payment_intent: "pi_basil" } }] } });
      }
      return ok({ id });
    },
  };

  const fromSession = await resolveStripePaymentIntentId("cs_pay", deps);
  assert(fromSession.ok && fromSession.paymentIntentId === "pi_from_session", "Checkout Session → PaymentIntent");

  const fromSubscription = await resolveStripePaymentIntentId("cs_sub", deps);
  assert(fromSubscription.ok && fromSubscription.paymentIntentId === "pi_from_invoice", "subscription Checkout → first invoice PI");

  const fromInvoice = await resolveStripePaymentIntentId("in_legacy", deps);
  assert(fromInvoice.ok && fromInvoice.paymentIntentId === "pi_from_invoice", "renewal invoice → PaymentIntent");

  const fromBasil = await resolveStripePaymentIntentId("in_basil", deps);
  assert(fromBasil.ok && fromBasil.paymentIntentId === "pi_basil", "newer API invoice.payments → PaymentIntent");

  const empty = await resolveStripePaymentIntentId("cs_empty", deps);
  assert(!empty.ok, "session without payment cannot be refunded");

  const missing = await resolveStripePaymentIntentId("cs_missing", deps);
  assert(!missing.ok && /No such/.test(missing.error), "Stripe lookup error is surfaced");

  const unknown = await resolveStripePaymentIntentId("manual-123", deps);
  assert(!unknown.ok, "non-Stripe reference is rejected");

  const direct = await resolveStripePaymentIntentId("pi_direct", deps);
  assert(direct.ok && direct.paymentIntentId === "pi_direct", "PaymentIntent reference used as-is");

  assert(paymentIntentIdFromInvoice({ payment_intent: { id: "pi_expanded" } }) === "pi_expanded", "expanded PI object handled");
  assert(
    paymentIntentIdFromInvoice({ payments: { data: [{ status: "canceled", payment: { payment_intent: "pi_x" } }] } }) === null,
    "unpaid invoice payments are skipped",
  );

  assert(
    isStripeRefundablePayment({ method: "STRIPE", provider: "stripe", providerRef: "cs_1" }),
    "Stripe checkout payment is refunded through Stripe",
  );
  assert(
    !isStripeRefundablePayment({ method: "STRIPE", provider: "stripe", providerRef: null }),
    "Stripe payment without a checkout reference is DB-only",
  );
  assert(
    !isStripeRefundablePayment({ method: "CASH", provider: null, providerRef: null }),
    "offline payment is DB-only",
  );
  console.log("PASS PaymentIntent resolution");
}

function charge(overrides: Partial<StripeChargeObject> = {}): StripeChargeObject {
  return {
    id: "ch_1",
    object: "charge",
    amount: 5500,
    amount_refunded: 5500,
    refunded: true,
    payment_intent: "pi_1",
    metadata: {},
    ...overrides,
  };
}

async function testChargeLookup() {
  assert(isStripeCharge(charge()), "charge object recognized");
  assert(!isStripeCharge({ id: "cs_1", object: "checkout.session" }), "non-charge rejected");

  const local = localChargePaymentLookup(charge({ metadata: { paymentRecordId: "pay_1" }, invoice: "in_1" }));
  assert(local.paymentRecordIds.join() === "pay_1", "charge metadata gives the payment record");
  assert(local.providerRefs.join() === "in_1", "legacy charge.invoice matches renewal providerRef");

  const fromIntent = await remoteChargePaymentLookup(charge(), {
    retrievePaymentIntent: () => ok({ id: "pi_1", metadata: { paymentRecordId: "pay_pi" } }),
    listCheckoutSessionsForPaymentIntent: () => fail("should not list sessions when PI metadata matches"),
  });
  assert(fromIntent.ok && fromIntent.paymentRecordIds.join() === "pay_pi", "PaymentIntent metadata gives the payment record");

  const fromSession = await remoteChargePaymentLookup(charge(), {
    retrievePaymentIntent: () => ok({ id: "pi_1", metadata: {} }),
    listCheckoutSessionsForPaymentIntent: () =>
      ok({ object: "list", data: [{ id: "cs_old", client_reference_id: "pay_old", metadata: {} }] }),
  });
  assert(fromSession.ok && fromSession.providerRefs.join() === "cs_old", "Checkout Session id matches providerRef");
  assert(fromSession.ok && fromSession.paymentRecordIds.join() === "pay_old", "client_reference_id gives the payment record");

  const none = await remoteChargePaymentLookup(charge(), {
    retrievePaymentIntent: () => ok({ id: "pi_1", metadata: {} }),
    listCheckoutSessionsForPaymentIntent: () => ok({ object: "list", data: [] }),
  });
  assert(none.ok && !none.paymentRecordIds.length && !none.providerRefs.length, "unknown charge resolves to nothing");

  const stripeDown = await remoteChargePaymentLookup(charge(), {
    retrievePaymentIntent: () => fail("Stripe unavailable"),
    listCheckoutSessionsForPaymentIntent: () => fail("Stripe unavailable"),
  });
  assert(!stripeDown.ok, "Stripe failure is an error so the webhook is retried");

  const noIntent = await remoteChargePaymentLookup(charge({ payment_intent: null }), {
    retrievePaymentIntent: () => fail("unreachable"),
    listCheckoutSessionsForPaymentIntent: () => fail("unreachable"),
  });
  assert(noIntent.ok && !noIntent.paymentRecordIds.length, "charge without PaymentIntent skips Stripe lookups");
  console.log("PASS charge lookup");
}

function testRefundPlan() {
  assert(chargeIsFullyRefunded(charge()), "refunded flag means full refund");
  assert(chargeIsFullyRefunded(charge({ refunded: undefined, amount_refunded: 5500 })), "amount_refunded == amount is full");
  assert(!chargeIsFullyRefunded(charge({ refunded: false, amount_refunded: 500 })), "partial refund is not full");

  assert(planChargeRefund({ status: "PAID" }, charge()) === "mark_refunded", "full refund marks a paid payment");
  assert(planChargeRefund({ status: "PENDING" }, charge()) === "mark_refunded", "full refund marks a pending payment");
  assert(planChargeRefund({ status: "REFUNDED" }, charge()) === "already_refunded", "already refunded is a no-op");
  assert(
    planChargeRefund({ status: "PAID" }, charge({ refunded: false, amount_refunded: 500 })) === "partial_refund",
    "partial refund leaves status",
  );
  assert(planChargeRefund({ status: "WAIVED" }, charge()) === "status_not_refundable", "waived payment is not flipped");
  console.log("PASS refund plan");
}

function testGuardWiring() {
  const action = readFileSync(join(ROOT, "lib/actions/payments.ts"), "utf8");
  const guard = action.indexOf("requireActiveTenantForWriteActions(options)");
  const refund = action.indexOf("createStripeRefund(");
  const update = action.indexOf("prisma.paymentRecord.update(");
  assert(guard >= 0, "refund action keeps the org-admin write guard");
  assert(refund > guard, "Stripe refund happens after the write guard");
  assert(update > refund, "record is marked REFUNDED only after the Stripe refund");
  assert(action.includes("tenantId: tenant.id"), "refund lookup stays tenant-scoped");

  const webhook = readFileSync(join(ROOT, "lib/payments/stripe-webhooks.ts"), "utf8");
  assert(webhook.includes('event.type === "charge.refunded"'), "webhook handles charge.refunded");
  assert(webhook.includes('status: { in: ["PAID", "PENDING"] }'), "webhook refund update is status-guarded");
  console.log("PASS refund guard wiring");
}

async function main() {
  testRefundParams();
  await testCreateRefundRequest();
  await testPaymentIntentResolution();
  await testChargeLookup();
  testRefundPlan();
  testGuardWiring();
  console.log("Stripe refund checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
