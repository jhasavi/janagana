import { NextRequest, NextResponse } from "next/server";
import { findMappedTenantsForUser } from "@/lib/tenant";
import { clearActiveTenantCookies, setActiveTenantCookie } from "@/lib/tenant";
import { createRequestId } from "@/lib/utils";
import { isSameOriginMutationRequest } from "@/lib/security/same-origin";

/**
 * POST /api/select-tenant
 *
 * Accepts tenantId from JSON body or form data, validates tenant access,
 * then sets active-tenant cookie and redirects to /dashboard.
 * State mutation is intentionally POST-only.
 */
export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  if (!isSameOriginMutationRequest(req)) {
    console.info("DASHBOARD_TENANT_FAILED", { reason: "INVALID_ORIGIN", requestId });
    return NextResponse.redirect(new URL("/select-organization?error=invalid-request", req.url));
  }

  let tenantId = "";
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { tenantId?: unknown };
    tenantId = String(body.tenantId ?? "").trim();
  } else {
    const form = await req.formData().catch(() => null);
    tenantId = String(form?.get("tenantId") ?? "").trim();
  }

  if (!tenantId) {
    console.info("DASHBOARD_TENANT_FAILED", { reason: "MISSING_SELECTED_TENANT", requestId });
    return NextResponse.redirect(new URL("/select-organization?error=missing-tenant", req.url));
  }

  const mappedTenants = await findMappedTenantsForUser();
  const selected = mappedTenants.find((t) => t.id === tenantId);

  if (!selected) {
    await clearActiveTenantCookies();
    console.info("DASHBOARD_TENANT_FAILED", { reason: "INVALID_SELECTED_TENANT", requestId, tenantId });
    return NextResponse.redirect(new URL("/select-organization?error=invalid-tenant", req.url));
  }

  await clearActiveTenantCookies();
  await setActiveTenantCookie(selected.id);
  console.info("SET_ACTIVE_TENANT", { requestId, tenantId: selected.id, source: "api-select-tenant" });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}

export async function GET(req: NextRequest) {
  const reason = req.nextUrl.searchParams.get("reason");

  if (reason === "stale-cookie") {
    await clearActiveTenantCookies();
    console.info("STALE_TENANT_COOKIE_CLEARED", { source: "api-select-tenant" });
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (reason === "auto-single") {
    const mappedTenants = await findMappedTenantsForUser();
    if (mappedTenants.length === 1) {
      await clearActiveTenantCookies();
      await setActiveTenantCookie(mappedTenants[0].id);
      console.info("SET_ACTIVE_TENANT", {
        tenantId: mappedTenants[0].id,
        source: "api-select-tenant-auto-single",
      });
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/select-organization", req.url));
  }

  return NextResponse.redirect(new URL("/select-organization?error=use-post", req.url));
}
