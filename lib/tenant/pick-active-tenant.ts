import type { MappedTenant } from "@/lib/tenant/tenant-resolver";

/**
 * Pure tenant picker for cookie, form hint, or single-tenant auto-select.
 * Used by dashboard layout resolution and server-action mutations.
 */
export function pickActiveTenant(
  mappedTenants: MappedTenant[],
  cookieTenantId: string | null,
  tenantIdHint: string | null | undefined
): MappedTenant | null {
  if (mappedTenants.length === 0) {
    return null;
  }

  if (cookieTenantId) {
    const fromCookie = mappedTenants.find((tenant) => tenant.id === cookieTenantId) ?? null;
    if (fromCookie) {
      return fromCookie;
    }
  }

  const hint = String(tenantIdHint ?? "").trim();
  if (hint) {
    const fromHint = mappedTenants.find((tenant) => tenant.id === hint) ?? null;
    if (fromHint) {
      return fromHint;
    }
  }

  if (mappedTenants.length === 1) {
    return mappedTenants[0];
  }

  return null;
}
