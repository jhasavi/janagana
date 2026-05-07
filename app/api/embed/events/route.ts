import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toPublicEventShape } from '@/lib/embed/public-event-shape'

const SUCCESS_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
const ERROR_CACHE_CONTROL = 'public, max-age=10, s-maxage=30, stale-while-revalidate=60'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-tenant-slug',
  Vary: 'x-tenant-slug',
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
    const { searchParams } = request.nextUrl
    const tenantSlug = searchParams.get('tenantSlug')
    const headerTenantSlug = request.headers.get('x-tenant-slug')
    if (headerTenantSlug && tenantSlug && headerTenantSlug !== tenantSlug) {
      return jsonWithCors(
        { error: 'Tenant slug mismatch' },
        { status: 403, headers: { 'Cache-Control': ERROR_CACHE_CONTROL } }
      )
    }
    const requestedMaxItems = Number.parseInt(searchParams.get('maxItems') ?? '10', 10)
    const maxItems = Number.isFinite(requestedMaxItems)
      ? Math.min(Math.max(requestedMaxItems, 1), 50)
      : 10

    if (!tenantSlug) {
      return jsonWithCors(
        { error: 'Missing tenantSlug' },
        { status: 400, headers: { 'Cache-Control': ERROR_CACHE_CONTROL } }
      )
    }

    // Get tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return jsonWithCors(
        { error: 'Organization not found' },
        { status: 404, headers: { 'Cache-Control': ERROR_CACHE_CONTROL } }
      )
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

    console.log('[embed.events.list.success]', {
      route: '/api/embed/events',
      tenantId: tenant.id,
      tenantSlug,
      count: events.length,
    })

    return jsonWithCors({
      success: true,
      data: events.map((event) => toPublicEventShape(event, tenantSlug)),
    }, { headers: { 'Cache-Control': SUCCESS_CACHE_CONTROL } })
  } catch (error) {
    console.error('Events fetch error:', error)
    return jsonWithCors(
      { error: 'Failed to fetch events' },
      { status: 500, headers: { 'Cache-Control': ERROR_CACHE_CONTROL } }
    )
  }
}
