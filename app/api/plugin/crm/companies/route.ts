import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPluginApiKey } from '@/lib/plugin-auth'

// GET /api/plugin/crm/companies - List companies
export async function GET(request: NextRequest) {
  try {
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''

    const where: any = { tenantId: tenant.id }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          _count: {
            select: {
              contacts: true,
              deals: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.company.count({ where }),
    ])

    return NextResponse.json({
      companies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('CRM companies error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}

// POST /api/plugin/crm/companies - Create company
export async function POST(request: NextRequest) {
  try {
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      domain,
      industry,
      size,
      website,
      phone,
      address,
      city,
      state,
      postalCode,
      country,
      description,
    } = body

    // Check if company already exists
    const existing = await prisma.company.findUnique({
      where: { tenantId_name: { tenantId: tenant.id, name } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Company with this name already exists' },
        { status: 409 }
      )
    }

    const company = await prisma.company.create({
      data: {
        tenantId: tenant.id,
        name,
        domain,
        industry,
        size,
        website,
        phone,
        address,
        city,
        state,
        postalCode,
        country: country || 'US',
        description,
      },
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('CRM create company error:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}
