/**
 * Tenant module — public portal vs admin dashboard.
 * @see lib/tenant/contract.ts
 */

import { prisma } from "@/lib/prisma";

/** Public portal only — URL slug, no Clerk session. */
export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findFirst({
    where: { slug, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      publicTagline: true,
      publicContactEmail: true,
      publicContactPhone: true,
      logoUrl: true,
    },
  });
}

export {
  findMappedTenantsForUser,
  validateActiveTenantCookie,
  resolveTenantForDashboard,
  type MappedTenant,
  type TenantResolutionResult,
  type TenantResolutionSource,
} from "./tenant-resolver";

export {
  getActiveTenantCookie,
  setActiveTenantCookie,
  clearActiveTenantCookies,
} from "./active-tenant-cookie";

export { requireActiveTenantForActions } from "./active-tenant-context";

export type { ActiveTenantActionContext, ActiveTenantActionResult } from "./active-tenant-context";

export { ACTIVE_TENANT_COOKIE_NAME } from "./contract";
