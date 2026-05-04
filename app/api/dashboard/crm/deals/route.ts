import { NextRequest, NextResponse } from 'next/server'
import { logTenantRequest, resolveDashboardTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const body = await request.json()
    const { contactId, companyId, title, description, valueCents, currency, stage, probability, expectedCloseDate, source } = body

    // Validate required fields
    if (!contactId || !title) {
      return NextResponse.json({ error: 'Contact ID and title are required' }, { status: 400 })
    }

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId: context.tenantId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
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

    // Create deal
    const deal = await prisma.deal.create({
      data: {
        tenantId: context.tenantId,
        contactId,
        companyId,
        title,
        description,
        valueCents: valueCents || 0,
        currency: currency || 'USD',
        stage: stage || 'LEAD',
        probability: probability || 0,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        source,
      },
    })

    logTenantRequest('dashboard.crm.deals.create.success', context, {
      dealId: deal.id,
      contactId,
      companyId: companyId ?? null,
    })

    return NextResponse.json({ success: true, deal })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}
