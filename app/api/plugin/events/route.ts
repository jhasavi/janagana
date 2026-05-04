import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolvePluginTenantContext } from '@/lib/plugin-auth'
import { logTenantRequest } from '@/lib/tenant'

// Valid event statuses from Prisma schema
const VALID_EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELED', 'COMPLETED'] as const

// GET /api/plugin/events - List events
export async function GET(request: NextRequest) {
  try {
    const tenantResolution = await resolvePluginTenantContext(request)
    if (!tenantResolution.ok) {
      console.warn('[plugin-events] tenant resolution failed', {
        route: tenantResolution.route,
        authPrincipal: tenantResolution.authPrincipal,
        status: tenantResolution.status,
      })
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PUBLISHED'

    // Validate status parameter
    if (!VALID_EVENT_STATUSES.includes(status as any)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_EVENT_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const events = await prisma.event.findMany({
      where: { 
        tenantId: context.tenantId,
        status: status as 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'COMPLETED',
      },
      orderBy: { startDate: 'asc' },
    })

    logTenantRequest('plugin.events.list.success', context, {
      status,
      count: events.length,
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Plugin events error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
