import { NextRequest, NextResponse } from 'next/server'
import { logTenantRequest, resolveDashboardTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { id } = await params
    const body = await request.json()
    const { contactId, dealId, title, description, status, priority, dueDate, completed } = body

    // Verify task belongs to tenant
    const task = await prisma.task.findFirst({
      where: { id, tenantId: context.tenantId },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

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

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        contactId,
        dealId,
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        completed,
        completedAt: completed ? new Date() : null,
      },
    })

    logTenantRequest('dashboard.crm.tasks.update.success', context, {
      taskId: id,
      contactId: contactId ?? null,
      dealId: dealId ?? null,
    })

    return NextResponse.json({ success: true, task: updatedTask })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { id } = await params

    // Verify task belongs to tenant
    const task = await prisma.task.findFirst({
      where: { id, tenantId: context.tenantId },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Delete task
    await prisma.task.delete({
      where: { id },
    })

    logTenantRequest('dashboard.crm.tasks.delete.success', context, {
      taskId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
