import { NextRequest, NextResponse } from 'next/server'
import { logTenantRequest, resolveDashboardTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (!query) {
      return NextResponse.json({ success: true, contacts: [] })
    }

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId: context.tenantId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { emails: { has: query.toLowerCase() } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
      },
      take: 10,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    logTenantRequest('dashboard.crm.contacts.search.success', context, {
      query,
      count: contacts.length,
    })

    return NextResponse.json({ success: true, contacts })
  } catch (error) {
    console.error('Error searching contacts:', error)
    return NextResponse.json({ error: 'Failed to search contacts' }, { status: 500 })
  }
}
