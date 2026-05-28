import { NextRequest, NextResponse } from "next/server";
import { listEmbedEvents } from "@/lib/embed/public-events";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get("tenantSlug")?.trim() ?? "";
  const maxItems = Math.min(Number(req.nextUrl.searchParams.get("maxItems") ?? "12"), 50);

  if (!tenantSlug) {
    return NextResponse.json(
      { success: false, error: "tenantSlug required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const result = await listEmbedEvents(tenantSlug, Number.isFinite(maxItems) ? maxItems : 12, "upcoming");

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json({ success: true, data: result.data }, { headers: corsHeaders });
}
