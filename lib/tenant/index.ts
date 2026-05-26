import { prisma } from "@/lib/prisma";

/**
 * Resolve a Tenant by its URL slug.
 *
 * Used ONLY by the public portal.
 * Does NOT use any Clerk session or cookie.
 * Does NOT create any Clerk Organization.
 */
export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug, status: "ACTIVE" },
    select: { id: true, name: true, slug: true },
  });
}

/**
 * Get the active Tenant for a Clerk organization ID.
 *
 * Used by the admin dashboard.
 * The clerkOrgId comes from the validated Clerk session — NOT a cookie.
 */
export async function getTenantByClerkOrgId(clerkOrgId: string) {
  return prisma.tenant.findUnique({
    where: { clerkOrgId, status: "ACTIVE" },
  });
}
