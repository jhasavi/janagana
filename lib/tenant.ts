/** Barrel — import from @/lib/tenant for all tenant resolution. */
export {
  getTenantBySlug,
  findMappedTenantsForUser,
  validateActiveTenantCookie,
  resolveTenantForDashboard,
  getActiveTenantCookie,
  setActiveTenantCookie,
  clearActiveTenantCookies,
  requireActiveTenantForActions,
  ACTIVE_TENANT_COOKIE_NAME,
  type MappedTenant,
  type TenantResolutionResult,
  type TenantResolutionSource,
  type ActiveTenantActionContext,
  type ActiveTenantActionResult,
} from "./tenant/index";
