import { NextRequest, NextResponse } from "next/server";
import { findMappedTenantsForUser } from "@/lib/tenant";
import { clearActiveTenantCookies, setActiveTenantCookie } from "@/lib/tenant";

/**
 * GET /api/select-tenant?tenantId=<id>
 *
 * Validates the requested tenantId against the user's mapped tenants,
 * sets the active-tenant cookie (via next/headers — valid in Route Handlers),
 * and redirects to /dashboard.
 * Cookies cannot be mutated during server-component render in Next.js 15.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tenantId = searchParams.get("tenantId")?.trim() ?? "";

  if (!tenantId) {
    return NextResponse.redirect(new URL("/select-organization?error=missing-tenant", req.url));
  }

  const mappedTenants = await findMappedTenantsForUser();
  const selected = mappedTenants.find((t) => t.id === tenantId);

  if (!selected) {
    return NextResponse.redirect(new URL("/select-organization?error=invalid-tenant", req.url));
  }

  await clearActiveTenantCookies();
  await setActiveTenantCookie(selected.id);

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
