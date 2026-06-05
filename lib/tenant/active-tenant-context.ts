import { getCurrentUser, type CurrentUserSummary } from "@/lib/auth";
import { resolveTenantForDashboard, type MappedTenant } from "@/lib/tenant/tenant-resolver";

export type ActiveTenantActionContext = {
  user: CurrentUserSummary;
  tenant: MappedTenant;
};

export type ActiveTenantActionResult =
  | { ok: true; context: ActiveTenantActionContext }
  | { ok: false; error: string };

/**
 * Server actions and mutations: require signed-in user + exactly one resolved tenant.
 * Pages/layouts should use resolveTenantForDashboard() directly for redirects.
 */
export async function requireActiveTenantForActions(): Promise<ActiveTenantActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const resolution = await resolveTenantForDashboard();
  if (resolution.status !== "ONE_TENANT") {
    return { ok: false, error: "No active tenant context" };
  }

  return { ok: true, context: { user, tenant: resolution.tenant } };
}
