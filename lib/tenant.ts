import { auth, clerkClient } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { logDbError, prisma, withDbRetry } from '@/lib/prisma'
import { getTenantProfile } from '@/lib/tenant-profile'
import { slugify } from '@/lib/utils'
import type { Tenant } from '@prisma/client'
import type { NextRequest } from 'next/server'

export type TenantRequestContext = {
  tenant: Tenant
  tenantId: string
  route: string
  authPrincipal: string
  principalType: 'clerk-user' | 'api-key'
  userId?: string
  orgId?: string
  apiKeyId?: string
  apiKeyPrefix?: string
}

type TenantContextResolutionResult =
  | {
      ok: true
      context: TenantRequestContext
    }
  | {
      ok: false
      status: number
      error: string
      route: string
      authPrincipal: string
    }

type TenantAuthState = {
  orgId: string | null
  userId: string | null
}

export function logTenantRequest(
  event: string,
  context: Pick<TenantRequestContext, 'tenantId' | 'route' | 'authPrincipal' | 'apiKeyId'>,
  details?: Record<string, unknown>
) {
  console.log(`[tenant-request] ${event}`, {
    tenantId: context.tenantId,
    route: context.route,
    authPrincipal: context.authPrincipal,
    apiKeyId: context.apiKeyId ?? null,
    ...(details ?? {}),
  })
}

function getRouteFromRequest(request?: Pick<NextRequest, 'nextUrl' | 'url'>) {
  if (!request) return 'server-action'
  return request.nextUrl?.pathname ?? new URL(request.url).pathname
}

async function resolveTenantForAuthState(
  authState: TenantAuthState,
  options?: { allowAutoCreateFromClerkOrg?: boolean }
): Promise<Tenant | null> {
  const { orgId, userId } = authState
  let tenantIdCookie: string | undefined
  const allowAutoCreateFromClerkOrg = options?.allowAutoCreateFromClerkOrg ?? true

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore-next-line
    const cookieStore = await cookies()
    tenantIdCookie = cookieStore?.get?.('JG_TENANT_ID')?.value
    if (tenantIdCookie) {
      const tenant = await withDbRetry(
        'resolveTenant.findUnique.byId',
        () => prisma.tenant.findUnique({ where: { id: tenantIdCookie } })
      )
      if (tenant) {
        console.log('[resolveTenant] resolved tenant via JG_TENANT_ID cookie=', tenant.id)
        return tenant
      }
    }

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
      console.log('[resolveTenant] no activeOrgId resolved — auth returned', { orgId, userId })
      return null
    }

    let tenant = await withDbRetry(
      'resolveTenant.findUnique.byClerkOrgId',
      () => prisma.tenant.findUnique({ where: { clerkOrgId: activeOrgId } })
    )

    if (!tenant && allowAutoCreateFromClerkOrg) {
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

          tenant = await withDbRetry('resolveTenant.createMissingTenantFromClerkOrg', () =>
            prisma.tenant.create({
              data: {
                clerkOrgId: activeOrgId,
                name: org.name || org.slug || `Organization ${activeOrgId.slice(0, 8)}`,
                slug,
                timezone: getTenantProfile().onboardingDefaults.timezone,
                primaryColor: getTenantProfile().onboardingDefaults.primaryColor,
              },
            })
          )
          console.log('[resolveTenant] created missing tenant from Clerk org', tenant.id)
        }
      } catch (error) {
        logDbError('resolveTenant.createMissingTenantFromClerkOrg', { clerkOrgId: activeOrgId }, error)
      }
    }

    return tenant
  } catch (err) {
    logDbError('resolveTenant', { tenantId: tenantIdCookie, clerkOrgId: orgId ?? undefined, userId: userId ?? undefined }, err)
    if (orgId) {
      return prisma.tenant.findUnique({ where: { clerkOrgId: orgId } })
    }
    return null
  }
}

/**
 * Get the current Clerk org's Tenant record from DB.
 * Returns null if no org is active.
 */
export async function getTenant(): Promise<Tenant | null> {
  const authState = await auth()
  return resolveTenantForAuthState(
    {
      orgId: authState.orgId ?? null,
      userId: authState.userId ?? null,
    },
    { allowAutoCreateFromClerkOrg: true }
  )
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

export async function resolveDashboardTenantContext(
  request: NextRequest
): Promise<TenantContextResolutionResult> {
  const route = getRouteFromRequest(request)
  const { userId, orgId } = await auth()
  const authPrincipal = userId ? `clerk:user:${userId}` : 'anonymous'

  if (!userId) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
      route,
      authPrincipal,
    }
  }

  const tenant = await resolveTenantForAuthState(
    {
      userId: userId ?? null,
      orgId: orgId ?? null,
    },
    { allowAutoCreateFromClerkOrg: false }
  )

  if (!tenant) {
    return {
      ok: false,
      status: 404,
      error: 'Tenant not found',
      route,
      authPrincipal,
    }
  }

  const context: TenantRequestContext = {
    tenant,
    tenantId: tenant.id,
    route,
    authPrincipal,
    principalType: 'clerk-user',
    userId,
    orgId: orgId ?? undefined,
  }

  logTenantRequest('tenant_context_resolved', context)

  return {
    ok: true,
    context,
  }
}
