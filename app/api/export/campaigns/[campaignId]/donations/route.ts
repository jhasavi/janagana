import { NextRequest, NextResponse } from "next/server";
import { buildCampaignDonationsCsv } from "@/lib/export/campaign-donations-csv";
import { requireExportTenant } from "@/lib/export/require-export-auth";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const auth = await requireExportTenant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { campaignId } = await params;
  const result = await buildCampaignDonationsCsv(auth.tenant.id, campaignId);
  if (!result) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const filename = `${auth.tenant.slug}-${result.campaign.slug}-donations-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(result.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
