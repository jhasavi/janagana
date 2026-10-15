import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";
import { appendPaymentNote, isStripeRefundablePayment, resolveStripePaymentIntentId } from "@/lib/payments/refunds";
import { createStripeRefund, retrieveStripeCheckoutSession, retrieveStripeInvoice } from "@/lib/payments/stripe";

const MarkRefundedSchema = z
  .object({
    paymentId: z.string().trim().min(1),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .strict();

/**
 * Stripe payments are refunded in Stripe first (reversing the Connect transfer
 * and JanaGana's application fee for destination charges); the record is only
 * marked REFUNDED once Stripe accepts the refund. Offline payments are just
 * marked. The charge.refunded webhook is idempotent with this path.
 */
export async function markPaymentRefunded(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const { tenant, user } = auth.context;

  const parsed = MarkRefundedSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid refund input" };
  }

  const payment = await prisma.paymentRecord.findFirst({
    where: { id: parsed.data.paymentId, tenantId: tenant.id },
    select: {
      id: true,
      status: true,
      notes: true,
      method: true,
      provider: true,
      providerRef: true,
      stripeConnectAccountId: true,
    },
  });

  if (!payment) {
    return { ok: false as const, error: "Payment not found" };
  }

  if (payment.status === "REFUNDED") {
    return { ok: true as const, data: payment, alreadyRefunded: true as const };
  }

  if (payment.status !== "PAID" && payment.status !== "PENDING") {
    return { ok: false as const, error: `Cannot refund payment with status ${payment.status}` };
  }

  const refundNote = parsed.data.notes?.trim();
  let stripeRefund: { refundId: string | null; paymentIntentId: string; connected: boolean } | null = null;

  if (isStripeRefundablePayment(payment)) {
    if (payment.status !== "PAID") {
      return { ok: false as const, error: "This Stripe payment has not settled yet; refund it once it is paid" };
    }
    const resolved = await resolveStripePaymentIntentId(payment.providerRef, {
      retrieveCheckoutSession: retrieveStripeCheckoutSession,
      retrieveInvoice: retrieveStripeInvoice,
    });
    if (!resolved.ok) {
      return { ok: false as const, error: `Stripe refund failed: ${resolved.error}` };
    }
    const connected = Boolean(payment.stripeConnectAccountId);
    const refund = await createStripeRefund({
      paymentIntentId: resolved.paymentIntentId,
      connected,
      paymentRecordId: payment.id,
      tenantId: tenant.id,
    });
    // Already refunded in Stripe (e.g. from the Stripe dashboard): just sync the record.
    if (!refund.ok && refund.code !== "charge_already_refunded") {
      return { ok: false as const, error: `Stripe refund failed: ${refund.error}` };
    }
    stripeRefund = {
      refundId: refund.ok ? refund.refundId : null,
      paymentIntentId: resolved.paymentIntentId,
      connected,
    };
  }

  const operatorLine = stripeRefund
    ? `Refunded in Stripe${stripeRefund.refundId ? ` (${stripeRefund.refundId})` : ""}${refundNote ? `: ${refundNote}` : ""}`
    : refundNote
      ? `Refund: ${refundNote}`
      : "Marked refunded by operator";

  const updated = await prisma.paymentRecord.update({
    where: { id: payment.id },
    data: {
      status: "REFUNDED",
      notes: appendPaymentNote(payment.notes, operatorLine),
    },
  });

  if (stripeRefund) {
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: user.id,
        action: "UPDATE",
        metadata: {
          entity: "PaymentRecord",
          source: "dashboard_refund",
          paymentId: payment.id,
          stripeRefundId: stripeRefund.refundId,
          stripePaymentIntentId: stripeRefund.paymentIntentId,
          reverseTransfer: stripeRefund.connected,
          stripeConnectAccountId: payment.stripeConnectAccountId,
        },
      },
    });
  }

  return { ok: true as const, data: updated, stripeRefundId: stripeRefund?.refundId ?? null };
}
