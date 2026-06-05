import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolveTenantForDashboard } from "@/lib/tenant";

export async function activeTenantJsonResponse(extraFields?: Record<string, unknown>) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const resolution = await resolveTenantForDashboard();
  if (resolution.status === "ZERO_TENANTS") {
    return NextResponse.json({ error: "No mapped tenant" }, { status: 404 });
  }
  if (resolution.status === "MULTI_TENANT") {
    return NextResponse.json({ error: "Multiple tenants available; select one" }, { status: 409 });
  }

  return NextResponse.json(
    {
      tenant: resolution.tenant,
      source: resolution.staleCookieIgnored ? "validated-membership" : "validated-selection",
      ...extraFields,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
