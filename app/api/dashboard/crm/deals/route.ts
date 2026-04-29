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
    const { contactId, companyId, title, description, valueCents, currency, stage, probability, expectedCloseDate, source } = body

    // Validate required fields
    if (!contactId || !title) {
      return NextResponse.json({ error: 'Contact ID and title are required' }, { status: 400 })
    }

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId: tenant.id },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Create deal
    const deal = await prisma.deal.create({
      data: {
        tenantId: tenant.id,
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

    return NextResponse.json({ success: true, deal })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}
