import { auth, clerkClient } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { logDbError, prisma, withDbRetry } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import type { Tenant } from '@prisma/client'

/**
 * Get the current Clerk org's Tenant record from DB.
 * Returns null if no org is active.
 */
export async function getTenant(): Promise<Tenant | null> {
  const { orgId, userId } = await auth()
  let tenantIdCookie: string | undefined

  // Prefer a short-lived tenant id cookie if present. The onboarding flow will
  // set `JG_TENANT_ID` so server-side helpers can resolve the tenant without
  // waiting for Clerk session `orgId` propagation.
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore-next-line
    const cookieStore = await cookies()
    tenantIdCookie = cookieStore?.get?.('JG_TENANT_ID')?.value
    if (tenantIdCookie) {
      const tenant = await withDbRetry(
        'getTenant.findUnique.byId',
        () => prisma.tenant.findUnique({ where: { id: tenantIdCookie } })
      )
      if (tenant) {
        console.log('[getTenant] resolved tenant via JG_TENANT_ID cookie=', tenant.id)
        return tenant
      }
    }

    // Fall back to Clerk org id (either from session or a short-lived
    // `JG_ACTIVE_ORG` cookie set during onboarding).
    let activeOrgId = orgId
    if (!activeOrgId) {
      const activeCookie = cookieStore?.get?.('JG_ACTIVE_ORG')?.value
      if (activeCookie) activeOrgId = activeCookie
    }

    if (!activeOrgId && userId) {
      const client = await clerkClient()
      const memberships = await client.users.getOrganizationMembershipList({
        userId,
        limit: 2,
      })

      if (memberships.data.length === 1) {
        activeOrgId = memberships.data[0].organization.id
      }
    }

    if (!activeOrgId) {
      console.log('[getTenant] no activeOrgId resolved — auth returned', { orgId, userId })
      return null
    }

    console.log('[getTenant] resolved activeOrgId=', activeOrgId)
    let tenant = await withDbRetry(
      'getTenant.findUnique.byClerkOrgId',
      () => prisma.tenant.findUnique({ where: { clerkOrgId: activeOrgId } })
    )

    if (!tenant) {
      try {
        const client = await clerkClient()
        const org = await client.organizations.getOrganization({ organizationId: activeOrgId })
        if (org) {
          const baseSlug = slugify(org.name || org.slug || activeOrgId)
          let slug = baseSlug
          let attempt = 0
          while (await prisma.tenant.findUnique({ where: { slug } })) {
            attempt++
            slug = `${baseSlug}-${attempt}`
          }

          tenant = await withDbRetry('getTenant.createMissingTenantFromClerkOrg', () =>
            prisma.tenant.create({
              data: {
                clerkOrgId: activeOrgId,
                name: org.name || org.slug || `Organization ${activeOrgId.slice(0, 8)}`,
                slug,
                timezone: 'America/New_York',
                primaryColor: '#4F46E5',
              },
            })
          )
          console.log('[getTenant] created missing tenant from Clerk org', tenant.id)
        }
      } catch (error) {
        logDbError('getTenant.createMissingTenantFromClerkOrg', { clerkOrgId: activeOrgId }, error)
      }
    }

    return tenant
  } catch (err) {
    logDbError('getTenant', { tenantId: tenantIdCookie, clerkOrgId: orgId ?? undefined, userId: userId ?? undefined }, err)
    if (orgId) {
      return prisma.tenant.findUnique({ where: { clerkOrgId: orgId } })
    }
    return null
  }
}

/**
 * Require a tenant — throws if not found. Use in Server Actions.
 */
export async function requireTenant(): Promise<Tenant> {
  const tenant = await getTenant()
  if (!tenant) {
    throw new Error('Organization not set up. Please complete onboarding.')
  }
  return tenant
}
