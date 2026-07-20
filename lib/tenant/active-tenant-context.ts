import { getCurrentUser, type CurrentUserSummary } from "@/lib/auth";
import { resolveOrgRoleForTenant } from "@/lib/auth/dashboard-access";
import { isClerkOrgAdminRole } from "@/lib/auth/clerk-roles";
import { pickActiveTenant } from "@/lib/tenant/pick-active-tenant";
import { getActiveTenantCookie, setActiveTenantCookie } from "@/lib/tenant/active-tenant-cookie";
import { findMappedTenantsForUser, type MappedTenant } from "@/lib/tenant/tenant-resolver";

export type ActiveTenantActionContext = {
  user: CurrentUserSummary;
  tenant: MappedTenant;
  orgRole: string;
  canWrite: boolean;
};

export type ActiveTenantActionResult =
  | { ok: true; context: ActiveTenantActionContext }
  | { ok: false; error: string };

export type TenantActionOptions = {
  /** From hidden form field when the active-tenant cookie is missing on POST. */
  tenantIdHint?: string;
};

/**
 * Server actions, mutations, and page-render reads: require signed-in user +
 * exactly one resolved tenant. Safe to call from a Server Component render —
 * the active-tenant cookie write inside is best-effort (see setActiveTenantCookie).
 * Pages/layouts that need redirect-on-stale-cookie/multi-tenant behavior should
 * still use resolveTenantForDashboard() directly for that purpose.
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

  const orgRole = await resolveOrgRoleForTenant(tenant.clerkOrgId);
  const canWrite = isClerkOrgAdminRole(orgRole);

  return { ok: true, context: { user, tenant, orgRole, canWrite } };
}

/**
 * Mutations: require admin/owner Clerk org role for the active tenant.
 */
export async function requireActiveTenantForWriteActions(
  options?: TenantActionOptions,
): Promise<ActiveTenantActionResult> {
  const result = await requireActiveTenantForActions(options);
  if (!result.ok) return result;
  if (!result.context.canWrite) {
    return {
      ok: false,
      error: "View-only access — your Clerk role cannot change data. Ask an org admin.",
    };
  }
  return result;
}

/**
 * Contact PII reads: require admin/owner Clerk org role for the active tenant.
 * View-only roles can browse the rest of the dashboard but not contact records.
 */
export async function requireAdminAccessForTenant(
  options?: TenantActionOptions,
): Promise<ActiveTenantActionResult> {
  const result = await requireActiveTenantForActions(options);
  if (!result.ok) return result;
  if (!result.context.canWrite) {
    return {
      ok: false,
      error: "Contacts are restricted to org admins. Ask an org admin for access.",
    };
  }
  return result;
}

/**
 * API route import handler: resolve tenant without mutating cookies.
 * Cookie is applied on redirect via applyActiveTenantCookieToResponse only.
 */
export async function requireActiveTenantForImport(
  options?: TenantActionOptions,
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

  const orgRole = await resolveOrgRoleForTenant(tenant.clerkOrgId);
  const canWrite = isClerkOrgAdminRole(orgRole);

  return { ok: true, context: { user, tenant, orgRole, canWrite } };
}
