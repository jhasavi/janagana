import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await auth()
    const tenant = await getTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (!query) {
      return NextResponse.json({ success: true, contacts: [] })
    }

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId: tenant.id,
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

    return NextResponse.json({ success: true, contacts })
  } catch (error) {
    console.error('Error searching contacts:', error)
    return NextResponse.json({ error: 'Failed to search contacts' }, { status: 500 })
  }
}
