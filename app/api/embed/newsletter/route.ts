import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncNewsletterSubscriptionToContact } from '@/lib/crm-sync'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

    return jsonWithCors({ success: true })
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return jsonWithCors({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
