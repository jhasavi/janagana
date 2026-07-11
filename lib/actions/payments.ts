import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";

const MarkRefundedSchema = z
  .object({
    paymentId: z.string().trim().min(1),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .strict();

export async function markPaymentRefunded(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const { tenant } = auth.context;

  const parsed = MarkRefundedSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid refund input" };
  }

  const payment = await prisma.paymentRecord.findFirst({
    where: { id: parsed.data.paymentId, tenantId: tenant.id },
    select: { id: true, status: true, notes: true },
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
  const mergedNotes = [payment.notes, refundNote ? `Refund: ${refundNote}` : "Marked refunded by operator"]
    .filter(Boolean)
    .join("\n");

  const updated = await prisma.paymentRecord.update({
    where: { id: payment.id },
    data: {
      status: "REFUNDED",
      notes: mergedNotes,
    },
  });

  return { ok: true as const, data: updated };
}
