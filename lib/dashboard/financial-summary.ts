import { prisma } from "@/lib/prisma";

export type PaymentListFilters = {
  purpose?: "MEMBERSHIP" | "EVENT" | "DONATION";
  status?: "PAID" | "PENDING" | "FAILED" | "WAIVED" | "REFUNDED";
};

export async function getTenantFinancialSummary(tenantId: string, filters: PaymentListFilters = {}) {
  const paymentWhere = {
    tenantId,
    ...(filters.purpose ? { purpose: filters.purpose } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [membershipPaid, eventPaid, donationPaid, pendingCount, recentPayments] = await Promise.all([
    prisma.paymentRecord.aggregate({
      where: { tenantId, purpose: "MEMBERSHIP", status: "PAID" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.paymentRecord.aggregate({
      where: { tenantId, purpose: "EVENT", status: "PAID" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.paymentRecord.aggregate({
      where: { tenantId, purpose: "DONATION", status: "PAID" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.paymentRecord.count({
      where: { tenantId, status: { in: ["PENDING", "FAILED"] } },
    }),
    prisma.paymentRecord.findMany({
      where: paymentWhere,
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 25,
      select: {
        id: true,
        amountCents: true,
        status: true,
        purpose: true,
        method: true,
        paidAt: true,
        createdAt: true,
        notes: true,
        receipt: { select: { id: true } },
        contact: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  return {
    membershipRevenueCents: membershipPaid._sum.amountCents ?? 0,
    membershipPaymentCount: membershipPaid._count,
    eventRevenueCents: eventPaid._sum.amountCents ?? 0,
    eventPaymentCount: eventPaid._count,
    donationRevenueCents: donationPaid._sum.amountCents ?? 0,
    donationPaymentCount: donationPaid._count,
    totalRevenueCents:
      (membershipPaid._sum.amountCents ?? 0) +
      (eventPaid._sum.amountCents ?? 0) +
      (donationPaid._sum.amountCents ?? 0),
    pendingOrFailedCount: pendingCount,
    recentPayments,
  };
}
