import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "@/lib/export/csv";

/**
 * One row per donor with their total qualifying gifts for a calendar year —
 * the artifact donors ask for at tax time. PAID and WAIVED count as
 * acknowledged; PENDING/FAILED/REFUNDED are excluded from the total.
 */
export async function buildGivingSummaryCsv(tenantId: string, year: number) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const donations = await prisma.paymentRecord.findMany({
    where: {
      tenantId,
      purpose: "DONATION",
      status: { in: ["PAID", "WAIVED"] },
      paidAt: { gte: start, lt: end },
    },
    orderBy: { paidAt: "asc" },
    select: {
      amountCents: true,
      paidAt: true,
      method: true,
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      receipt: { select: { receiptNumber: true } },
    },
  });

  type Summary = {
    contactId: string;
    firstName: string;
    lastName: string;
    email: string;
    totalCents: number;
    giftCount: number;
    firstGift: Date;
    lastGift: Date;
    receiptNumbers: string[];
  };

  const byContact = new Map<string, Summary>();

  for (const donation of donations) {
    const key = donation.contact?.id ?? `anonymous:${donation.contact?.email ?? "unknown"}`;
    const paidAt = donation.paidAt ?? new Date();
    const existing = byContact.get(key);
    const receiptNumber = donation.receipt?.receiptNumber;

    if (existing) {
      existing.totalCents += donation.amountCents;
      existing.giftCount += 1;
      if (paidAt < existing.firstGift) existing.firstGift = paidAt;
      if (paidAt > existing.lastGift) existing.lastGift = paidAt;
      if (receiptNumber) existing.receiptNumbers.push(receiptNumber);
      continue;
    }

    byContact.set(key, {
      contactId: donation.contact?.id ?? "",
      firstName: donation.contact?.firstName ?? "Anonymous",
      lastName: donation.contact?.lastName ?? "",
      email: donation.contact?.email ?? "",
      totalCents: donation.amountCents,
      giftCount: 1,
      firstGift: paidAt,
      lastGift: paidAt,
      receiptNumbers: receiptNumber ? [receiptNumber] : [],
    });
  }

  const summaries = Array.from(byContact.values()).sort((a, b) => b.totalCents - a.totalCents);

  const headers = [
    "firstName",
    "lastName",
    "email",
    "taxYear",
    "totalGiftsUSD",
    "giftCount",
    "firstGiftDate",
    "lastGiftDate",
    "receiptNumbers",
  ];

  const rows = summaries.map((s) => [
    s.firstName,
    s.lastName,
    s.email,
    year,
    (s.totalCents / 100).toFixed(2),
    s.giftCount,
    s.firstGift.toISOString().slice(0, 10),
    s.lastGift.toISOString().slice(0, 10),
    s.receiptNumbers.join("; "),
  ]);

  return {
    csv: rowsToCsv(headers, rows),
    totalDonors: summaries.length,
    totalCents: summaries.reduce((sum, s) => sum + s.totalCents, 0),
  };
}
