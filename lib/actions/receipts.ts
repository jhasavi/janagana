import { prisma } from "@/lib/prisma";
import { requireActiveTenantForActions } from "@/lib/tenant";

export async function getReceiptForOperator(receiptId: string) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: null };
  }
  const context = auth.context;

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { id: receiptId, tenantId: context.tenant.id },
    include: {
      tenant: { select: { name: true, publicContactEmail: true, publicContactPhone: true, logoUrl: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
      membership: { select: { tier: { select: { name: true } } } },
      payment: { select: { method: true, purpose: true, paidAt: true } },
    },
  });

  if (!receipt) {
    return { ok: false as const, error: "Receipt not found", data: null };
  }

  return { ok: true as const, data: receipt };
}
