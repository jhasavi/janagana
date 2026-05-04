import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolvePluginTenantContext } from '@/lib/plugin-auth'
import { logTenantRequest } from '@/lib/tenant'

// GET /api/plugin/crm/activities - List activities
export async function GET(request: NextRequest) {
  try {
    const tenantResolution = await resolvePluginTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type')
    const contactId = searchParams.get('contactId')
    const dealId = searchParams.get('dealId')

    const where: any = { tenantId: context.tenantId }
    
    if (type) {
      where.type = type
    }

    if (contactId) {
      where.contactId = contactId
    }

    if (dealId) {
      where.dealId = dealId
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          contact: true,
          deal: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activity.count({ where }),
    ])

    logTenantRequest('plugin.crm.activities.list.success', context, {
      page,
      limit,
      count: activities.length,
      total,
    })

    return NextResponse.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('CRM activities error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

// POST /api/plugin/crm/activities - Create activity
export async function POST(request: NextRequest) {
  try {
    const tenantResolution = await resolvePluginTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const body = await request.json()
    const {
      contactId,
      dealId,
      type,
      title,
      description,
      direction,
      duration,
      location,
      completed,
      completedAt,
    } = body

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, tenantId: context.tenantId },
        select: { id: true },
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
        completed: completed || false,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
      include: {
        contact: true,
        deal: true,
      },
    })

    logTenantRequest('plugin.crm.activities.create.success', context, {
      activityId: activity.id,
      contactId: contactId ?? null,
      dealId: dealId ?? null,
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('CRM create activity error:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}
