import { NextResponse } from "next/server";
import { buildEventRegistrationsCsv } from "@/lib/export/registrations-csv";
import { requireExportTenant } from "@/lib/export/require-export-auth";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const auth = await requireExportTenant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { eventId } = await params;
  const result = await buildEventRegistrationsCsv(auth.tenant.id, eventId);
  if (!result) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const filename = `${auth.tenant.slug}-${result.event.slug}-registrations.csv`;

  return new NextResponse(result.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
