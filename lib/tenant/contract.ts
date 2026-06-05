/**
 * Tenant resolution contract (pilot v1)
 *
 * PUBLIC PORTAL
 * - getTenantBySlug(slug) only — no Clerk, no cookie.
 *
 * ADMIN DASHBOARD
 * - Clerk membership ∩ ACTIVE Tenant rows → mapped tenants.
 * - JG_ACTIVE_TENANT_ID cookie = preference only; re-validated every request.
 * - Stale cookie → ignored; clear via GET /api/select-tenant?reason=stale-cookie.
 * - Single mapped tenant → auto-persist via GET /api/select-tenant?reason=auto-single.
 *
 * SERVER ACTIONS
 * - requireActiveTenantForActions() — must resolve to ONE_TENANT.
 *
 * APIs
 * - GET /api/active-tenant (canonical)
 * - GET /api/active-org (deprecated alias)
 */

export const ACTIVE_TENANT_COOKIE_NAME = "JG_ACTIVE_TENANT_ID";
