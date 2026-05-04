import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const orgId = body?.orgId
    const tenantId = body?.tenantId
    if (!orgId && !tenantId) {
      return NextResponse.json({ success: false, error: 'Missing orgId or tenantId' }, { status: 400 })
    }

    // Set short-lived cookies for server-side tenant/org resolution
    const res = NextResponse.json({ success: true })
    if (orgId) {
      res.cookies.set('JG_ACTIVE_ORG', String(orgId), {
        path: '/',
        maxAge: 60,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }
    if (tenantId) {
      res.cookies.set('JG_TENANT_ID', String(tenantId), {
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
      tenantId,
    })
    return res
  } catch (err) {
    console.error('[api/active-org] error', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
