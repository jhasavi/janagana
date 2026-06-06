import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { issueReceiptForPayment } from "@/lib/payments/receipts";

type StripeCheckoutSession = {
  id: string;
  object: "checkout.session";
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  customer_email?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
};

function isCheckoutSession(value: unknown): value is StripeCheckoutSession {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { object?: unknown }).object === "checkout.session" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

function jsonMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as Prisma.InputJsonObject;
}

export async function processStripeWebhookEvent(event: StripeEvent) {
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
    select: { id: true },
  });
  if (existing) {
    return { ok: true as const, duplicate: true, processed: false };
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        metadata: jsonMetadata({ ignored: true }),
      },
    });
    return { ok: true as const, duplicate: false, processed: false };
  }

  if (!isCheckoutSession(event.data.object)) {
    return { ok: false as const, error: "Webhook event object is not a Checkout Session" };
  }

  const session = event.data.object;
  const paymentRecordId = session.metadata?.paymentRecordId ?? session.client_reference_id ?? null;
  if (!paymentRecordId) {
    return { ok: false as const, error: "Checkout Session is missing payment metadata" };
  }

  const payment = await prisma.paymentRecord.findFirst({
    where: {
      OR: [
        { id: paymentRecordId },
        { provider: "stripe", providerRef: session.id },
      ],
    },
    include: {
      membership: { include: { tier: true } },
      contact: true,
    },
  });
  if (!payment || !payment.membership || !payment.contact) {
    return { ok: false as const, error: "Payment record not found for Checkout Session" };
  }

  const membership = payment.membership;
  const contact = payment.contact;
  const paid = session.payment_status === "paid" || event.type === "checkout.session.async_payment_succeeded";
  const nextPaymentStatus = paid ? "PAID" : "PENDING";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: nextPaymentStatus,
        method: "STRIPE",
        provider: "stripe",
        providerRef: session.id,
        amountCents: session.amount_total ?? payment.amountCents,
        currency: (session.currency ?? payment.currency).toUpperCase(),
        paidAt: paid ? now : payment.paidAt,
        notes: paid ? "Stripe Checkout payment confirmed" : "Stripe Checkout completed; payment not marked paid",
      },
    });

    if (paid) {
      await tx.membership.update({
        where: { id: membership.id },
        data: {
          status: "ACTIVE",
          startsAt: membership.startsAt ?? now,
        },
      });

      await tx.contact.update({
        where: { id: contact.id },
        data: {
          type: "MEMBER",
          lastActivityAt: now,
          lastActivitySummary: `Paid for ${membership.tier.name}`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: payment.tenantId,
        actorUserId: null,
        action: "UPDATE",
        metadata: {
          entity: "PaymentRecord",
          source: "stripe_webhook",
          stripeEventId: event.id,
          stripeCheckoutSessionId: session.id,
          paymentId: payment.id,
          membershipId: membership.id,
          nextPaymentStatus,
        },
      },
    });
  });

  if (paid) {
    await issueReceiptForPayment(payment.id);
  }

  await prisma.stripeWebhookEvent.upsert({
    where: { stripeEventId: event.id },
    update: {
      tenantId: payment.tenantId,
      eventType: event.type,
      metadata: jsonMetadata({
        checkoutSessionId: session.id,
        paymentRecordId: payment.id,
        membershipId: membership.id,
        paid,
      }),
    },
    create: {
      tenantId: payment.tenantId,
      stripeEventId: event.id,
      eventType: event.type,
      metadata: jsonMetadata({
        checkoutSessionId: session.id,
        paymentRecordId: payment.id,
        membershipId: membership.id,
        paid,
      }),
    },
  });

  return { ok: true as const, duplicate: false, processed: true };
}
