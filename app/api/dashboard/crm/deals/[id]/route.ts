import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth()
    const tenant = await getTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const { contactId, companyId, title, description, valueCents, currency, stage, probability, expectedCloseDate, actualCloseDate } = body

    // Verify deal belongs to tenant
    const deal = await prisma.deal.findFirst({
      where: { id, tenantId: tenant.id },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Update deal
    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: {
        contactId,
        companyId,
        title,
        description,
        valueCents,
        currency,
        stage,
        probability,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        actualCloseDate: actualCloseDate ? new Date(actualCloseDate) : null,
      },
    })

    return NextResponse.json({ success: true, deal: updatedDeal })
  } catch (error) {
    console.error('Error updating deal:', error)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth()
    const tenant = await getTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { id } = await params

    // Verify deal belongs to tenant
    const deal = await prisma.deal.findFirst({
      where: { id, tenantId: tenant.id },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Delete deal (cascade will delete related activities and tasks)
    await prisma.deal.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deal:', error)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
