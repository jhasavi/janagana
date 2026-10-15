#!/usr/bin/env tsx
/**
 * charge.refunded webhook against the local database: full refund flips the
 * record once, replays and re-deliveries are no-ops, partial refunds leave the
 * status alone, and unknown charges are acknowledged. No Stripe network calls
 * (charges carry paymentRecordId metadata or no PaymentIntent).
 *
 *   npm run test:stripe-refund-webhook
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { processStripeWebhookEvent } from "@/lib/payments/stripe-webhooks";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`Refusing to run against non-local DATABASE_URL host "${host || "(unset)"}"`);
  }
}

function chargeRefundedEvent(id: string, charge: Record<string, unknown>) {
  return { id, type: "charge.refunded", data: { object: { object: "charge", ...charge } } };
}

async function main() {
  assertLocalDatabase();
  const marker = `refund-wh-${Date.now().toString(36)}`;
  const tenant = await prisma.tenant.create({
    data: { slug: `${marker}-t`, name: `Refund ${marker}`, clerkOrgId: `dev_${marker}`, status: "ACTIVE" },
  });
  const eventIds: string[] = [];
  const event = (suffix: string, charge: Record<string, unknown>) => {
    const id = `evt_${marker}_${suffix}`;
    eventIds.push(id);
    return chargeRefundedEvent(id, charge);
  };

  try {
    const base = {
      tenantId: tenant.id,
      amountCents: 5000,
      platformTipCents: 500,
      applicationFeeCents: 680,
      stripeConnectAccountId: "acct_test_refunds",
      status: "PAID" as const,
      method: "STRIPE" as const,
      purpose: "DONATION" as const,
      provider: "stripe",
      paidAt: new Date(),
    };
    const full = await prisma.paymentRecord.create({ data: { ...base, providerRef: `cs_${marker}_full` } });
    const partial = await prisma.paymentRecord.create({ data: { ...base, providerRef: `cs_${marker}_partial` } });

    const fullCharge = {
      id: `ch_${marker}_full`,
      amount: 5500,
      amount_refunded: 5500,
      refunded: true,
      metadata: { paymentRecordId: full.id },
    };

    const first = await processStripeWebhookEvent(event("full", fullCharge));
    assert(first.ok && first.processed && !first.duplicate, "full refund is processed");
    const afterFirst = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: full.id } });
    assert(afterFirst.status === "REFUNDED", "full refund marks the payment REFUNDED");
    assert((afterFirst.notes ?? "").includes(fullCharge.id), "refund note names the charge");

    const replay = await processStripeWebhookEvent(event("full", fullCharge));
    assert(replay.ok && replay.duplicate && !replay.processed, "replayed event is a duplicate");

    const redelivered = await processStripeWebhookEvent(event("full2", fullCharge));
    assert(redelivered.ok && redelivered.duplicate && !redelivered.processed, "second event for a refunded charge is a no-op");
    const afterRedelivery = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: full.id } });
    assert(afterRedelivery.notes === afterFirst.notes, "no-op does not append notes again");

    const partialResult = await processStripeWebhookEvent(
      event("partial", {
        id: `ch_${marker}_partial`,
        amount: 5500,
        amount_refunded: 1000,
        refunded: false,
        metadata: { paymentRecordId: partial.id },
      }),
    );
    assert(partialResult.ok && !partialResult.processed, "partial refund is not a status change");
    const afterPartial = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: partial.id } });
    assert(afterPartial.status === "PAID", "partial refund leaves the payment PAID");

    const audits = await prisma.auditLog.count({
      where: { tenantId: tenant.id, metadata: { path: ["source"], equals: "stripe_webhook" } },
    });
    assert(audits === 2, `expected audit rows for the full and partial refund, got ${audits}`);

    const unmatched = await processStripeWebhookEvent(
      event("unmatched", { id: `ch_${marker}_unknown`, amount: 100, amount_refunded: 100, refunded: true, payment_intent: null }),
    );
    assert(unmatched.ok && !unmatched.processed, "unknown charge is acknowledged without changes");

    const malformed = await processStripeWebhookEvent({
      id: `evt_${marker}_bad`,
      type: "charge.refunded",
      data: { object: { object: "refund", id: "re_1" } },
    });
    assert(!malformed.ok, "non-charge payload is rejected");

    console.log("PASS charge.refunded webhook (full, replay, redelivery, partial, unmatched, malformed)");
  } finally {
    await prisma.stripeWebhookEvent.deleteMany({ where: { stripeEventId: { in: eventIds } } });
    await prisma.paymentRecord.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
