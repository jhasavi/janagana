import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueReceiptForPayment } from "@/lib/payments/receipts";
import { requireActiveTenantForActions, type TenantActionOptions } from "@/lib/tenant";

const PaymentMethodSchema = z.enum(["OFFLINE", "CASH", "CHECK", "CARD", "BANK_TRANSFER", "STRIPE", "OTHER"]);
const PaymentStatusSchema = z.enum(["PAID", "PENDING", "FAILED", "REFUNDED", "WAIVED"]);

export const RecordOfflineDonationSchema = z
  .object({
    contactId: z.string().trim().min(1),
    amountCents: z.number().int().min(1),
    method: PaymentMethodSchema.default("OFFLINE"),
    status: PaymentStatusSchema.default("PAID"),
    paidAt: z.coerce.date().optional().nullable(),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .strict();

export type DonationListRow = {
  id: string;
  amountCents: number;
  status: string;
  method: string;
  paidAt: Date | null;
  createdAt: Date;
  notes: string | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  } | null;
  receiptNumber: string | null;
};

export async function listDonationAdminData() {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: null };
  }
  const context = auth.context;

  const [donations, paidAgg, contacts] = await Promise.all([
    prisma.paymentRecord.findMany({
      where: { tenantId: context.tenant.id, purpose: "DONATION" },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        amountCents: true,
        status: true,
        method: true,
        paidAt: true,
        createdAt: true,
        notes: true,
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        receipt: { select: { receiptNumber: true } },
      },
    }),
    prisma.paymentRecord.aggregate({
      where: { tenantId: context.tenant.id, purpose: "DONATION", status: "PAID" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.contact.findMany({
      where: { tenantId: context.tenant.id },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
    }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthCents = donations
    .filter((row) => row.status === "PAID" && row.paidAt && row.paidAt >= monthStart)
    .reduce((sum, row) => sum + row.amountCents, 0);

  const rows: DonationListRow[] = donations.map((row) => ({
    id: row.id,
    amountCents: row.amountCents,
    status: row.status,
    method: row.method,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    notes: row.notes,
    contact: row.contact,
    receiptNumber: row.receipt?.receiptNumber ?? null,
  }));

  return {
    ok: true as const,
    data: {
      donations: rows,
      contacts,
      summary: {
        totalReceivedCents: paidAgg._sum.amountCents ?? 0,
        donationCount: paidAgg._count,
        thisMonthCents,
        pendingCount: donations.filter((row) => row.status === "PENDING").length,
      },
    },
  };
}

export async function recordOfflineDonation(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  const parsed = RecordOfflineDonationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid donation input" };
  }

  const contact = await prisma.contact.findFirst({
    where: { id: parsed.data.contactId, tenantId: context.tenant.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!contact) {
    return { ok: false as const, error: "Contact not found" };
  }

  const paidAt = parsed.data.paidAt ?? new Date();

  try {
    const payment = await prisma.paymentRecord.create({
      data: {
        tenantId: context.tenant.id,
        contactId: contact.id,
        amountCents: parsed.data.amountCents,
        method: parsed.data.method,
        status: parsed.data.status,
        purpose: "DONATION",
        paidAt: parsed.data.status === "PAID" ? paidAt : null,
        notes: parsed.data.notes || null,
      },
    });

    if (parsed.data.status === "PAID") {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          type: "DONOR",
          lastActivityAt: new Date(),
          lastActivitySummary: "Donation recorded by admin",
        },
      });
      await issueReceiptForPayment(payment.id);
    }

    await prisma.auditLog.create({
      data: {
        tenantId: context.tenant.id,
        actorUserId: context.user.id,
        action: "CREATE",
        metadata: {
          entity: "PaymentRecord",
          purpose: "DONATION",
          paymentId: payment.id,
          contactId: contact.id,
          source: "admin_offline",
        },
      },
    });

    return { ok: true as const, data: payment };
  } catch {
    return { ok: false as const, error: "Failed to record donation" };
  }
}
