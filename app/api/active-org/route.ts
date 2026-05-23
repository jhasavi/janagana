import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAuthOrgRedirectDecision } from '@/lib/auth-org-redirect-log'
import {
  getCurrentIdentity,
  setActiveOrgCookies,
  userBelongsToOrg,
} from '@/lib/auth/auth-provider'

export async function POST(req: Request) {
  try {
    if (checkRateLimit(req, { maxRequests: 20, windowMs: 60_000 })) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
    }

    const { userId } = await getCurrentIdentity()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const requestedOrgId = typeof body?.orgId === 'string' ? body.orgId.trim() : ''
    const requestedTenantId = typeof body?.tenantId === 'string' ? body.tenantId.trim() : ''
    logAuthOrgRedirectDecision({
      route: '/api/active-org',
      userPresent: true,
      membershipCount: null,
      activeOrgCookiePresent: false,
      selectedTenantIdPresent: Boolean(requestedTenantId),
      redirectTarget: null,
      reasonCode: 'MULTI_ORG_SELECT_REQUEST',
    })
    if (!requestedOrgId && !requestedTenantId) {
      return NextResponse.json({ success: false, error: 'Missing orgId or tenantId' }, { status: 400 })
    }

    const tenant = requestedTenantId
      ? await prisma.tenant.findUnique({ where: { id: requestedTenantId } })
      : requestedOrgId
        ? await prisma.tenant.findUnique({ where: { clerkOrgId: requestedOrgId } })
        : null

    if (requestedTenantId && !tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    }

    const orgId = tenant?.clerkOrgId ?? requestedOrgId
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Missing organization id' }, { status: 400 })
    }

    if (requestedOrgId && tenant && requestedOrgId !== tenant.clerkOrgId) {
      return NextResponse.json({ success: false, error: 'Tenant/org mismatch' }, { status: 403 })
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
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
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
      authPrincipal: `clerk:user:${userId}`,
      orgId,
      tenantId: tenant?.id ?? null,
    })
    return res
  } catch (err) {
    console.error('[api/active-org] error', err)
    const isTestMode = process.env.E2E_TEST_MODE === 'true' || process.env.PLAYWRIGHT_TEST === 'true'
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: isTestMode ? message : 'Server error' }, { status: 500 })
  }
}
