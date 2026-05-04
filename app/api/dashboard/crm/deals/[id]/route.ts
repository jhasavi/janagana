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
    const { contactId, companyId, title, description, valueCents, currency, stage, probability, expectedCloseDate, actualCloseDate } = body

    // Verify deal belongs to tenant
    const deal = await prisma.deal.findFirst({
      where: { id, tenantId: context.tenantId },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
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

    if (companyId) {
      const company = await prisma.company.findFirst({
        where: { id: companyId, tenantId: context.tenantId },
        select: { id: true },
      })
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }
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

    logTenantRequest('dashboard.crm.deals.update.success', context, {
      dealId: id,
      contactId: contactId ?? null,
      companyId: companyId ?? null,
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
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { id } = await params

    // Verify deal belongs to tenant
    const deal = await prisma.deal.findFirst({
      where: { id, tenantId: context.tenantId },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Delete deal (cascade will delete related activities and tasks)
    await prisma.deal.delete({
      where: { id },
    })

    logTenantRequest('dashboard.crm.deals.delete.success', context, {
      dealId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deal:', error)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
