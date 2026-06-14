import { getCurrentUser, type CurrentUserSummary } from "@/lib/auth";
import { pickActiveTenant } from "@/lib/tenant/pick-active-tenant";
import { getActiveTenantCookie, setActiveTenantCookie } from "@/lib/tenant/active-tenant-cookie";
import { findMappedTenantsForUser, type MappedTenant } from "@/lib/tenant/tenant-resolver";

export type ActiveTenantActionContext = {
  user: CurrentUserSummary;
  tenant: MappedTenant;
};

export type ActiveTenantActionResult =
  | { ok: true; context: ActiveTenantActionContext }
  | { ok: false; error: string };

export type TenantActionOptions = {
  /** From hidden form field when the active-tenant cookie is missing on POST. */
  tenantIdHint?: string;
};

/**
 * Server actions and mutations: require signed-in user + exactly one resolved tenant.
 * Pages/layouts should use resolveTenantForDashboard() directly for redirects.
 */
export async function requireActiveTenantForActions(
  options?: TenantActionOptions
): Promise<ActiveTenantActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const mappedTenants = await findMappedTenantsForUser();
  if (mappedTenants.length === 0) {
    return { ok: false, error: "No tenant access" };
  }

  const cookieTenantId = await getActiveTenantCookie();
  const tenant = pickActiveTenant(mappedTenants, cookieTenantId, options?.tenantIdHint);

  if (!tenant) {
    return { ok: false, error: "No active tenant context" };
  }

  if (cookieTenantId !== tenant.id) {
    await setActiveTenantCookie(tenant.id);
    console.info("SET_ACTIVE_TENANT", {
      tenantId: tenant.id,
      source: options?.tenantIdHint ? "server-action-form-hint" : "server-action-auto",
    });
  }

  return { ok: true, context: { user, tenant } };
}
