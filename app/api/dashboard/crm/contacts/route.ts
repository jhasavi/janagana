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
    const { firstName, lastName, email, phone, jobTitle, linkedinUrl, companyName, source, notes } = body

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        firstName,
        lastName,
        email,
        phone,
        jobTitle,
        linkedinUrl,
        companyName,
        source,
        notes,
      },
    })

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
