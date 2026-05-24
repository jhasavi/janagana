import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAuthOrgRedirectDecision } from '@/lib/auth-org-redirect-log'
import {
  clearActiveOrgCookies,
  getCurrentIdentity,
  setActiveOrgCookies,
  userBelongsToOrg,
} from '@/lib/auth/auth-provider'

const activeOrgRequestSchema = z
  .object({
    orgId: z.string().trim().min(1).max(128).optional(),
    tenantId: z.string().trim().min(1).max(128).optional(),
  })
  .refine((value) => Boolean(value.orgId || value.tenantId), {
    message: 'Missing orgId or tenantId',
  })

export async function POST(req: Request) {
  try {
    const requestOrigin = new URL(req.url).origin
    const originHeader = req.headers.get('origin')
    const fetchSiteHeader = req.headers.get('sec-fetch-site')

    if ((originHeader && originHeader !== requestOrigin) || fetchSiteHeader === 'cross-site') {
      return NextResponse.json({ success: false, error: 'Invalid request origin' }, { status: 403 })
    }

    if (checkRateLimit(req, { maxRequests: 20, windowMs: 60_000 })) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
    }

    const { userId, mode } = await getCurrentIdentity()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody = await req.json().catch(() => null)
    const parsedBody = activeOrgRequestSchema.safeParse(rawBody)
    if (!parsedBody.success) {
      return NextResponse.json({ success: false, error: 'Missing orgId or tenantId' }, { status: 400 })
    }

    const requestedOrgId = parsedBody.data.orgId ?? ''
    const requestedTenantId = parsedBody.data.tenantId ?? ''

    async function denyWithCookieReset(error: string, status: number) {
      const response = NextResponse.json({ success: false, error }, { status })
      await clearActiveOrgCookies(response)
      return response
    }

    logAuthOrgRedirectDecision({
      route: '/api/active-org',
      userPresent: true,
      membershipCount: null,
      activeOrgCookiePresent: false,
      selectedTenantIdPresent: Boolean(requestedTenantId),
      redirectTarget: null,
      reasonCode: 'MULTI_ORG_SELECT_REQUEST',
    })

    const tenant = requestedTenantId
      ? await prisma.tenant.findUnique({ where: { id: requestedTenantId } })
      : requestedOrgId
        ? await prisma.tenant.findUnique({ where: { clerkOrgId: requestedOrgId } })
        : null

    if (requestedTenantId && !tenant) {
      return denyWithCookieReset('Tenant not found', 404)
    }

    const orgId = tenant?.clerkOrgId ?? requestedOrgId
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Missing organization id' }, { status: 400 })
    }

    if (requestedOrgId && tenant && requestedOrgId !== tenant.clerkOrgId) {
      return denyWithCookieReset('Tenant/org mismatch', 403)
    }

    const allowed = await userBelongsToOrg(userId, orgId)
    if (!allowed) {
      logAuthOrgRedirectDecision({
        route: '/api/active-org',
        userPresent: true,
        membershipCount: null,
        activeOrgCookiePresent: false,
        selectedTenantIdPresent: Boolean(requestedTenantId),
        redirectTarget: null,
        reasonCode: 'STALE_ACTIVE_ORG_REJECTED',
      })
      return denyWithCookieReset('Access denied', 403)
    }

    // Set short-lived cookies for server-side tenant/org resolution
    const res = NextResponse.json({ success: true })
    await setActiveOrgCookies(res, orgId, tenant?.id ?? null)
    logAuthOrgRedirectDecision({
      route: '/api/active-org',
      userPresent: true,
      membershipCount: null,
      activeOrgCookiePresent: true,
      selectedTenantIdPresent: Boolean(requestedTenantId),
      redirectTarget: null,
      reasonCode: 'ACTIVE_ORG_SET',
    })
    if (tenant) {
      logAuthOrgRedirectDecision({
        route: '/api/active-org',
        userPresent: true,
        membershipCount: null,
        activeOrgCookiePresent: true,
        selectedTenantIdPresent: true,
        redirectTarget: null,
        reasonCode: 'ACTIVE_TENANT_SET',
      })
    }
    logAuthOrgRedirectDecision({
      route: '/api/active-org',
      userPresent: true,
      membershipCount: null,
      activeOrgCookiePresent: true,
      selectedTenantIdPresent: Boolean(tenant),
      redirectTarget: '/dashboard',
      reasonCode: 'ACTIVE_ORG_SWITCHED',
    })
    console.log('[api/active-org] set cookies', {
      route: '/api/active-org',
      authPrincipal: `${mode}:user:${userId}`,
      orgId,
      tenantId: tenant?.id ?? null,
    })
    return res
  } catch (err) {
    console.error('[api/active-org] error', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
