import { getCurrentUser, getDashboardAccessForTenant } from "@/lib/auth";
import { resolveTenantForDashboard } from "@/lib/tenant";

/**
 * Every export under /api/export/* carries real PII (contacts, donors,
 * registrants) — restricted to admin/owner Clerk org roles, same as
 * contact record reads in the dashboard.
 */
export async function requireExportTenant() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }

  const resolution = await resolveTenantForDashboard();
  if (resolution.status !== "ONE_TENANT") {
    return { ok: false as const, status: 403, error: "No active tenant" };
  }

  const access = await getDashboardAccessForTenant(resolution.tenant);
  if (!access.canWrite) {
    return { ok: false as const, status: 403, error: "Exports are restricted to org admins" };
  }

  return { ok: true as const, tenant: resolution.tenant, user };
}
