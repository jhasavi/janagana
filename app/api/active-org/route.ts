import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolveTenantForDashboard } from "@/lib/tenant";

/**
 * GET /api/active-org
 *
 * Returns the current tenant info based on the Clerk session's active org.
 * The Clerk session is the source of truth — NOT any cookie.
 */
export async function GET() {
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

  return NextResponse.json({ tenant: resolution.tenant });
}
