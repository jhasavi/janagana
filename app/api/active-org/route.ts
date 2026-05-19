import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

async function userBelongsToOrganization(userId: string, organizationId: string) {
  const client = await clerkClient()
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId,
    userId: [userId],
    limit: 1,
  })

  return memberships.data.length > 0
}

export async function POST(req: Request) {
  try {
    if (checkRateLimit(req, { maxRequests: 20, windowMs: 60_000 })) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const requestedOrgId = typeof body?.orgId === 'string' ? body.orgId.trim() : ''
    const requestedTenantId = typeof body?.tenantId === 'string' ? body.tenantId.trim() : ''
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

    const allowed = await userBelongsToOrganization(userId, orgId)
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    // Set short-lived cookies for server-side tenant/org resolution
    const res = NextResponse.json({ success: true })
    res.cookies.set('JG_ACTIVE_ORG', orgId, {
      path: '/',
      maxAge: 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    if (tenant) {
      res.cookies.set('JG_TENANT_ID', tenant.id, {
        path: '/',
        maxAge: 60,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }
    console.log('[api/active-org] set cookies', {
      route: '/api/active-org',
      authPrincipal: `clerk:user:${userId}`,
      orgId,
      tenantId: tenant?.id ?? null,
    })
    return res
  } catch (err) {
    console.error('[api/active-org] error', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
