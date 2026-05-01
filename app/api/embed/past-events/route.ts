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
    const requestedMaxItems = Number.parseInt(searchParams.get('maxItems') ?? '20', 10)
    const maxItems = Number.isFinite(requestedMaxItems)
      ? Math.min(Math.max(requestedMaxItems, 1), 100)
      : 20

    if (!tenantSlug) {
      return jsonWithCors({ error: 'Missing tenantSlug' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return jsonWithCors({ error: 'Organization not found' }, { status: 404 })
    }

    // Past events: COMPLETED status OR startDate in the past with PUBLISHED status
    const events = await prisma.event.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { status: 'COMPLETED' },
          {
            status: 'PUBLISHED',
            startDate: { lt: new Date() },
          },
        ],
      },
      orderBy: { startDate: 'desc' },
      take: maxItems,
    })

    return jsonWithCors({
      success: true,
      data: events.map((event) => toPublicEventShape(event, tenantSlug)),
    })
  } catch (error) {
    console.error('Past events fetch error:', error)
    return jsonWithCors({ error: 'Failed to fetch past events' }, { status: 500 })
  }
}
