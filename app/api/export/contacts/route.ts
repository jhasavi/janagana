import { NextResponse } from "next/server";
import { buildContactsCsv } from "@/lib/export/contacts-csv";
import { requireExportTenant } from "@/lib/export/require-export-auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireExportTenant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const csv = await buildContactsCsv(auth.tenant.id);
  const filename = `${auth.tenant.slug}-contacts-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
