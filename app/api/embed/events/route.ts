import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get('tenantSlug')

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Missing tenantSlug' }, { status: 400 })
    }

    // Get tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get upcoming events
    const events = await prisma.event.findMany({
      where: {
        tenantId: tenant.id,
        status: 'PUBLISHED',
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: 'asc' },
      take: 10,
    })

    return NextResponse.json({ success: true, data: events })
  } catch (error) {
    console.error('Events fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
