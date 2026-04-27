import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPluginApiKey } from '@/lib/plugin-auth'

// GET /api/plugin/crm/activities - List activities
export async function GET(request: NextRequest) {
  try {
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type')
    const contactId = searchParams.get('contactId')
    const dealId = searchParams.get('dealId')

    const where: any = { tenantId: tenant.id }
    
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
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const activity = await prisma.activity.create({
      data: {
        tenantId: tenant.id,
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

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('CRM create activity error:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}
