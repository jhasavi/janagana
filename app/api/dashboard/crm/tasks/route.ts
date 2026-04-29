import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    const tenant = await getTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const body = await request.json()
    const { contactId, dealId, title, description, status, priority, dueDate } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Verify contact belongs to tenant if provided
    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, tenantId: tenant.id },
      })
      if (!contact) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
      }
    }

    // Verify deal belongs to tenant if provided
    if (dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: dealId, tenantId: tenant.id },
      })
      if (!deal) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
      }
    }

    // Create task
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
    })

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
