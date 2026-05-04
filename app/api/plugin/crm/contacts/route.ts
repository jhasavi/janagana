import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolvePluginTenantContext } from '@/lib/plugin-auth'
import { logTenantRequest } from '@/lib/tenant'

// GET /api/plugin/crm/contacts - List contacts
export async function GET(request: NextRequest) {
  try {
    const tenantResolution = await resolvePluginTenantContext(request)
    if (!tenantResolution.ok) {
      console.warn('[plugin-crm-contacts-get] tenant resolution failed', {
        route: tenantResolution.route,
        authPrincipal: tenantResolution.authPrincipal,
        status: tenantResolution.status,
      })
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const companyId = searchParams.get('companyId')

    const where: any = { tenantId: context.tenantId }
    
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

    logTenantRequest('plugin.crm.contacts.list.success', context, {
      page,
      limit,
      count: contacts.length,
      total,
    })

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
    const tenantResolution = await resolvePluginTenantContext(request)
    if (!tenantResolution.ok) {
      console.warn('[plugin-crm-contacts-post] tenant resolution failed', {
        route: tenantResolution.route,
        authPrincipal: tenantResolution.authPrincipal,
        status: tenantResolution.status,
      })
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

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

    // Check if contact already exists by primary email
    const existing = email
      ? await prisma.contact.findFirst({
          where: { tenantId: context.tenantId, email },
        })
      : null

    if (existing) {
      return NextResponse.json(
        { error: 'Contact with this email already exists' },
        { status: 409 }
      )
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

    if (memberId) {
      const member = await prisma.member.findFirst({
        where: { id: memberId, tenantId: context.tenantId },
        select: { id: true },
      })
      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId: context.tenantId,
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

    logTenantRequest('plugin.crm.contacts.create.success', context, {
      contactId: contact.id,
      companyId: companyId ?? null,
      memberId: memberId ?? null,
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
