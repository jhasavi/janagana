import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toPublicEventShape } from '@/lib/embed/public-event-shape'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get('tenantSlug')
    const requestedMaxItems = Number.parseInt(searchParams.get('maxItems') ?? '10', 10)
    const maxItems = Number.isFinite(requestedMaxItems)
      ? Math.min(Math.max(requestedMaxItems, 1), 50)
      : 10

    if (!tenantSlug) {
      return jsonWithCors({ error: 'Missing tenantSlug' }, { status: 400 })
    }

    // Get tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return jsonWithCors({ error: 'Organization not found' }, { status: 404 })
    }

    // Get upcoming events
    const events = await prisma.event.findMany({
      where: {
        tenantId: tenant.id,
        status: 'PUBLISHED',
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: 'asc' },
      take: maxItems,
    })

    return jsonWithCors({
      success: true,
      data: events.map((event) => toPublicEventShape(event, tenantSlug)),
    })
  } catch (error) {
    console.error('Events fetch error:', error)
    return jsonWithCors({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
