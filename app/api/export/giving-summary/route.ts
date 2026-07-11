import { NextRequest, NextResponse } from "next/server";
import { buildGivingSummaryCsv } from "@/lib/export/giving-summary-csv";
import { requireExportTenant } from "@/lib/export/require-export-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireExportTenant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : new Date().getFullYear();

  const { csv } = await buildGivingSummaryCsv(auth.tenant.id, year);
  const filename = `${auth.tenant.slug}-giving-summary-${year}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
