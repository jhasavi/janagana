import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPluginApiKey } from '@/lib/plugin-auth'

// GET /api/plugin/crm/contacts - List contacts
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
    const companyId = searchParams.get('companyId')

    const where: any = { tenantId: tenant.id }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (companyId) {
      where.companyId = companyId
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          company: true,
          member: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('CRM contacts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

// POST /api/plugin/crm/contacts - Create contact
export async function POST(request: NextRequest) {
  try {
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      linkedinUrl,
      avatarUrl,
      companyId,
      memberId,
      source,
      notes,
    } = body

    // Check if contact already exists
    const existing = await prisma.contact.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Contact with this email already exists' },
        { status: 409 }
      )
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        firstName,
        lastName,
        email,
        phone,
        jobTitle,
        linkedinUrl,
        avatarUrl,
        companyId,
        memberId,
        source,
        notes,
      },
      include: {
        company: true,
        member: true,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('CRM create contact error:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
