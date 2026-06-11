import { getCurrentUser } from "@/lib/auth";
import { resolveTenantForDashboard } from "@/lib/tenant";

export async function requireExportTenant() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, status: 401, error: "Not authenticated" };
  }

  const resolution = await resolveTenantForDashboard();
  if (resolution.status !== "ONE_TENANT") {
    return { ok: false as const, status: 403, error: "No active tenant" };
  }

  return { ok: true as const, tenant: resolution.tenant, user };
}
