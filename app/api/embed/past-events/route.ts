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
  const maxItems = Math.min(Number(req.nextUrl.searchParams.get("maxItems") ?? "24"), 50);

  if (!tenantSlug) {
    return NextResponse.json(
      { success: false, error: "tenantSlug required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const result = await listEmbedEvents(tenantSlug, Number.isFinite(maxItems) ? maxItems : 24, "past");

  return NextResponse.json(
    { success: result.ok, data: result.data, error: result.ok ? undefined : result.error },
    { status: result.ok ? 200 : 404, headers: corsHeaders },
  );
}
