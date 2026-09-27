import { getCampaignDonationsForExport } from "@/lib/actions/campaigns";
import { rowsToCsv } from "@/lib/export/csv";

export async function buildCampaignDonationsCsv(tenantId: string, campaignId: string) {
  const result = await getCampaignDonationsForExport(tenantId, campaignId);
  if (!result) return null;

  const headers = [
    "paidAt",
    "status",
    "amountCents",
    "currency",
    "donorFirstName",
    "donorLastName",
    "donorEmail",
    "via",
    "providerRef",
  ];

  const rows = result.donations.map((payment) => [
    payment.paidAt ? payment.paidAt.toISOString() : "",
    payment.status,
    payment.amountCents,
    payment.currency,
    payment.contact?.firstName ?? "",
    payment.contact?.lastName ?? "",
    payment.contact?.email ?? "",
    payment.peerFundraiser ? `Fundraiser: ${payment.peerFundraiser.title || payment.peerFundraiser.slug}` : "Direct to campaign",
    payment.providerRef,
  ]);

  return { csv: rowsToCsv(headers, rows), campaign: result.campaign };
}
