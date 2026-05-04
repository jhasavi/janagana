import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncNewsletterSubscriptionToContact } from '@/lib/crm-sync'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-tenant-slug',
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS })
}

function jsonWithCors(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers || {}),
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantSlug, email, firstName, lastName } = body
    const headerTenantSlug = request.headers.get('x-tenant-slug')

    if (headerTenantSlug && tenantSlug && headerTenantSlug !== tenantSlug) {
      return jsonWithCors({ error: 'Tenant slug mismatch' }, { status: 403 })
    }

    if (!tenantSlug || !email) {
      return jsonWithCors({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return jsonWithCors({ error: 'Organization not found' }, { status: 404 })
    }

    // Sync to CRM
    await syncNewsletterSubscriptionToContact({
      tenantId: tenant.id,
      email,
      firstName,
      lastName,
    })

    console.log('[embed.newsletter.subscribe.success]', {
      route: '/api/embed/newsletter',
      tenantId: tenant.id,
      tenantSlug,
      email,
    })

    return jsonWithCors({ success: true })
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return jsonWithCors({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
