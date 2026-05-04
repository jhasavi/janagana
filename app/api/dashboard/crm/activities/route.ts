import { NextRequest, NextResponse } from 'next/server'
import { logTenantRequest, resolveDashboardTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      console.warn('[dashboard-crm-activities] tenant resolution failed', {
        route: tenantResolution.route,
        authPrincipal: tenantResolution.authPrincipal,
        status: tenantResolution.status,
      })
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const body = await request.json()
    const { contactId, dealId, type, title, description, direction, duration, location } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Verify contact belongs to tenant if provided
    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, tenantId: context.tenantId },
      })
      if (!contact) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
      }
    }

    if (dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: dealId, tenantId: context.tenantId },
        select: { id: true },
      })
      if (!deal) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
      }
    }

    // Create activity
    const activity = await prisma.activity.create({
      data: {
        tenantId: context.tenantId,
        contactId,
        dealId,
        type,
        title,
        description,
        direction,
        duration,
        location,
      },
    })

    logTenantRequest('dashboard.crm.activities.create.success', context, {
      activityId: activity.id,
      contactId: contactId ?? null,
      dealId: dealId ?? null,
    })

    return NextResponse.json({ success: true, activity })
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
  }
}
