import { clerkClient } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { logDbError, prisma, withDbRetry } from '@/lib/prisma'
import {
  getSimplifiedTenantProfile,
  getSimplifiedTenantProfileValidationErrors,
} from '@/lib/tenant-profile-simplified'
import { logAuthOrgRedirectDecision } from '@/lib/auth-org-redirect-log'
import {
  getCurrentIdentity,
  getUserOrgMemberships,
  userBelongsToOrg,
} from '@/lib/auth/auth-provider'
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

function getTenantCreationDefaults() {
  const fallback = {
    timezone: process.env.TENANT_DEFAULT_TIMEZONE ?? 'America/New_York',
    primaryColor: process.env.TENANT_ONBOARDING_DEFAULT_PRIMARY_COLOR ?? process.env.TENANT_BRAND_PRIMARY_COLOR ?? '#4F46E5',
  }

  try {
    if (getSimplifiedTenantProfileValidationErrors().length > 0) return fallback
    const profile = getSimplifiedTenantProfile()
    return {
      timezone: profile.onboardingDefaults.timezone ?? fallback.timezone,
      primaryColor: profile.onboardingDefaults.primaryColor ?? fallback.primaryColor,
    }
  } catch (error) {
    console.warn('[resolveTenant] using fallback tenant defaults', error)
    return fallback
  }
}

async function resolveTenantForAuthState(
  authState: TenantAuthState,
  options?: { allowAutoCreateFromClerkOrg?: boolean }
): Promise<Tenant | null> {
  const { orgId, userId } = authState
  let tenantIdCookie: string | undefined
  const allowAutoCreateFromClerkOrg = options?.allowAutoCreateFromClerkOrg ?? true

  try {
    const cookieStore = await cookies()
    tenantIdCookie = cookieStore?.get?.('JG_TENANT_ID')?.value

    let activeOrgId = orgId
    const activeOrgCookie = cookieStore?.get?.('JG_ACTIVE_ORG')?.value
    if (!activeOrgId) {
      if (activeOrgCookie) {
        let hasMembership = await userBelongsToOrg(userId, activeOrgCookie)
        if (!hasMembership) {
          console.warn('[resolveTenant] active org cookie membership check failed, retrying once', {
            activeOrgId: activeOrgCookie,
            userId,
          })
          await new Promise((resolve) => setTimeout(resolve, 800))
          hasMembership = await userBelongsToOrg(userId, activeOrgCookie)
        }

        if (hasMembership) {
          activeOrgId = activeOrgCookie
        } else {
          logAuthOrgRedirectDecision({
            route: 'resolveTenant',
            userPresent: Boolean(userId),
            membershipCount: null,
            activeOrgCookiePresent: true,
            selectedTenantIdPresent: Boolean(tenantIdCookie),
            redirectTarget: null,
            reasonCode: 'STALE_COOKIE_IGNORED',
          })
          console.warn('[resolveTenant] active org cookie membership still unavailable', {
            activeOrgId: activeOrgCookie,
            userId,
          })
        }
      }
    }

    // Deterministic multi-org behavior: if the Clerk session has an orgId but
    // app-side active-org cookies are absent, force explicit selection when the
    // user belongs to multiple orgs.
    if (activeOrgId && userId && !activeOrgCookie && !tenantIdCookie) {
      try {
        const memberships = await getUserOrgMemberships(userId)

        if (memberships.length > 1) {
          logAuthOrgRedirectDecision({
            route: 'resolveTenant',
            userPresent: true,
            membershipCount: memberships.length,
            activeOrgCookiePresent: false,
            selectedTenantIdPresent: false,
            redirectTarget: '/select-organization',
            reasonCode: 'MULTI_ORG_REDIRECT_SELECT_ORG',
          })
          return null
        }
      } catch (error) {
        console.warn('[resolveTenant] multi-org check failed; continuing with Clerk active org', {
          userId,
          activeOrgId,
          error,
        })
      }
    }

    if (tenantIdCookie) {
      const tenant = await withDbRetry(
        'resolveTenant.findUnique.byId',
        () => prisma.tenant.findUnique({ where: { id: tenantIdCookie } })
      )
      if (tenant) {
        const matchesActiveOrg = !activeOrgId || activeOrgId === tenant.clerkOrgId
        if (!matchesActiveOrg) {
          logAuthOrgRedirectDecision({
            route: 'resolveTenant',
            userPresent: Boolean(userId),
            membershipCount: null,
            activeOrgCookiePresent: Boolean(cookieStore?.get?.('JG_ACTIVE_ORG')?.value),
            selectedTenantIdPresent: true,
            redirectTarget: null,
            reasonCode: 'STALE_ACTIVE_ORG_REJECTED',
          })
          console.warn('[resolveTenant] rejected stale tenant cookie due to active org mismatch', {
            tenantId: tenant.id,
            tenantClerkOrgId: tenant.clerkOrgId,
            activeOrgId,
            userId,
          })
        } else {
        const hasMembership = await userBelongsToOrg(userId, tenant.clerkOrgId)

        if (hasMembership) {
          console.log('[resolveTenant] resolved tenant via verified JG_TENANT_ID cookie=', tenant.id)
          return tenant
        }

        console.warn('[resolveTenant] rejected tenant cookie because membership verification failed', {
          tenantId: tenant.id,
          tenantClerkOrgId: tenant.clerkOrgId,
          activeOrgId,
          userId,
        })
        }
      }
    }

    if (!activeOrgId && userId) {
      const memberships = await getUserOrgMemberships(userId)

      if (memberships.length === 1) {
        logAuthOrgRedirectDecision({
          route: 'resolveTenant',
          userPresent: true,
          membershipCount: 1,
          activeOrgCookiePresent: Boolean(cookieStore?.get?.('JG_ACTIVE_ORG')?.value),
          selectedTenantIdPresent: Boolean(tenantIdCookie),
          redirectTarget: '/dashboard',
          reasonCode: 'ONE_ORG_AUTO_SELECT_DASHBOARD',
        })
        activeOrgId = memberships[0].organization.id
      }
    }

    if (!activeOrgId) {
      console.log('[resolveTenant] no activeOrgId resolved — auth returned', { orgId, userId })
      return null
    }

    const activeOrgMembership = await userBelongsToOrg(userId, activeOrgId)
    if (!activeOrgMembership) {
      logAuthOrgRedirectDecision({
        route: 'resolveTenant',
        userPresent: Boolean(userId),
        membershipCount: null,
        activeOrgCookiePresent: Boolean(cookieStore?.get?.('JG_ACTIVE_ORG')?.value),
        selectedTenantIdPresent: Boolean(tenantIdCookie),
        redirectTarget: null,
        reasonCode: 'STALE_ACTIVE_ORG_REJECTED',
      })
      console.warn('[resolveTenant] rejected active org without user membership', {
        activeOrgId,
        userId,
      })
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
          const defaults = getTenantCreationDefaults()

          tenant = await withDbRetry('resolveTenant.createMissingTenantFromClerkOrg', () =>
            prisma.tenant.create({
              data: {
                clerkOrgId: activeOrgId,
                name: org.name || org.slug || `Organization ${activeOrgId.slice(0, 8)}`,
                slug,
                timezone: defaults.timezone,
                primaryColor: defaults.primaryColor,
              },
            })
          )
          logAuthOrgRedirectDecision({
            route: 'resolveTenant',
            userPresent: Boolean(userId),
            membershipCount: null,
            activeOrgCookiePresent: Boolean(cookieStore?.get?.('JG_ACTIVE_ORG')?.value),
            selectedTenantIdPresent: Boolean(tenantIdCookie),
            redirectTarget: null,
            reasonCode: 'TENANT_REPAIR_CREATED',
          })
          console.log('[resolveTenant] created missing tenant from Clerk org', tenant.id)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : ''
        if (message.includes('unique') || message.includes('duplicate')) {
          logAuthOrgRedirectDecision({
            route: 'resolveTenant',
            userPresent: Boolean(userId),
            membershipCount: null,
            activeOrgCookiePresent: Boolean(cookieStore?.get?.('JG_ACTIVE_ORG')?.value),
            selectedTenantIdPresent: Boolean(tenantIdCookie),
            redirectTarget: null,
            reasonCode: 'TENANT_DUPLICATE_BLOCKED',
          })
        }
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
  const authState = await getCurrentIdentity()
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
  const identity = await getCurrentIdentity()
  const { userId, orgId } = identity
  const authPrincipal = userId ? `${identity.mode}:user:${userId}` : 'anonymous'

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
