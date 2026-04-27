import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPluginApiKey } from '@/lib/plugin-auth'

// GET /api/plugin/crm/deals - List deals
export async function GET(request: NextRequest) {
  try {
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const stage = searchParams.get('stage')
    const contactId = searchParams.get('contactId')
    const companyId = searchParams.get('companyId')

    const where: any = { tenantId: tenant.id }
    
    if (stage) {
      where.stage = stage
    }

    if (contactId) {
      where.contactId = contactId
    }

    if (companyId) {
      where.companyId = companyId
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          contact: true,
          company: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.deal.count({ where }),
    ])

    return NextResponse.json({
      deals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('CRM deals error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    )
  }
}

// POST /api/plugin/crm/deals - Create deal
export async function POST(request: NextRequest) {
  try {
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      contactId,
      companyId,
      title,
      description,
      valueCents,
      currency,
      stage,
      probability,
      expectedCloseDate,
      source,
      sourceId,
    } = body

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
        sourceId,
      },
      include: {
        contact: true,
        company: true,
      },
    })

    return NextResponse.json(deal, { status: 201 })
  } catch (error) {
    console.error('CRM create deal error:', error)
    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 500 }
    )
  }
}
