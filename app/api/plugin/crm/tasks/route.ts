import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolvePluginTenantContext } from '@/lib/plugin-auth'
import { logTenantRequest } from '@/lib/tenant'

// GET /api/plugin/crm/tasks - List tasks
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
    const status = searchParams.get('status')
    const contactId = searchParams.get('contactId')
    const dealId = searchParams.get('dealId')

    const where: any = { tenantId: context.tenantId }
    
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

    logTenantRequest('plugin.crm.tasks.list.success', context, {
      page,
      limit,
      count: tasks.length,
      total,
    })

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
    const tenantResolution = await resolvePluginTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

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

    const task = await prisma.task.create({
      data: {
        tenantId: context.tenantId,
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

    logTenantRequest('plugin.crm.tasks.create.success', context, {
      taskId: task.id,
      contactId: contactId ?? null,
      dealId: dealId ?? null,
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
