import { prisma } from "@/lib/prisma";

export type PlatformTipsReport = Awaited<ReturnType<typeof getPlatformTipsReport>>;

/** Platform-wide (cross-tenant) revenue view. Only call behind isPlatformAdmin. */
export async function getPlatformTipsReport(now = new Date()) {
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

  const [byTenant, recent, tenants] = await Promise.all([
    prisma.paymentRecord.groupBy({
      by: ["tenantId"],
      where: { status: "PAID", OR: [{ platformTipCents: { gt: 0 } }, { applicationFeeCents: { gt: 0 } }] },
      _sum: { platformTipCents: true, applicationFeeCents: true, amountCents: true },
      _count: { _all: true },
    }),
    prisma.paymentRecord.findMany({
      where: { status: "PAID", paidAt: { gte: since }, platformTipCents: { gt: 0 } },
      select: { paidAt: true, platformTipCents: true },
    }),
    prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        stripeConnectStatus: true,
        stripeConnectChargesEnabled: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const tenantRows = byTenant
    .map((row) => {
      const tipsCents = row._sum.platformTipCents ?? 0;
      const applicationFeeCents = row._sum.applicationFeeCents ?? 0;
      return {
        tenantId: row.tenantId,
        tenantName: tenantById.get(row.tenantId)?.name ?? row.tenantId,
        tenantSlug: tenantById.get(row.tenantId)?.slug ?? "",
        payments: row._count._all,
        tipsCents,
        processingRecoveryCents: Math.max(0, applicationFeeCents - tipsCents),
        orgAmountCents: row._sum.amountCents ?? 0,
      };
    })
    .sort((a, b) => b.tipsCents - a.tipsCents);

  const months: { month: string; tipsCents: number; tippedPayments: number }[] = [];
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
    months.push({ month: d.toISOString().slice(0, 7), tipsCents: 0, tippedPayments: 0 });
  }
  const monthIndex = new Map(months.map((m, i) => [m.month, i]));
  for (const row of recent) {
    if (!row.paidAt) continue;
    const idx = monthIndex.get(row.paidAt.toISOString().slice(0, 7));
    if (idx === undefined) continue;
    months[idx].tipsCents += row.platformTipCents;
    months[idx].tippedPayments += 1;
  }

  return {
    totals: {
      tipsCents: tenantRows.reduce((sum, row) => sum + row.tipsCents, 0),
      processingRecoveryCents: tenantRows.reduce((sum, row) => sum + row.processingRecoveryCents, 0),
      orgAmountCents: tenantRows.reduce((sum, row) => sum + row.orgAmountCents, 0),
      payments: tenantRows.reduce((sum, row) => sum + row.payments, 0),
    },
    tenantRows,
    months,
    connect: {
      total: tenants.length,
      active: tenants.filter((tenant) => tenant.stripeConnectChargesEnabled).length,
      tenants,
    },
  };
}
