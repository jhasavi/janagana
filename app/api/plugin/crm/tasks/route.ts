import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPluginApiKey } from '@/lib/plugin-auth'

// GET /api/plugin/crm/tasks - List tasks
export async function GET(request: NextRequest) {
  try {
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    const contactId = searchParams.get('contactId')
    const dealId = searchParams.get('dealId')

    const where: any = { tenantId: tenant.id }
    
    if (status) {
      where.status = status
    }

    if (contactId) {
      where.contactId = contactId
    }

    if (dealId) {
      where.dealId = dealId
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          contact: true,
          deal: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dueDate: 'asc' },
      }),
      prisma.task.count({ where }),
    ])

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('CRM tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// POST /api/plugin/crm/tasks - Create task
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
      title,
      description,
      status,
      priority,
      dueDate,
    } = body

    const task = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        contactId,
        dealId,
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        contact: true,
        deal: true,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('CRM create task error:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
