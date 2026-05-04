import { NextRequest, NextResponse } from 'next/server'
import { logTenantRequest, resolveDashboardTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      console.warn('[dashboard-crm-contacts] tenant resolution failed', {
        route: tenantResolution.route,
        authPrincipal: tenantResolution.authPrincipal,
        status: tenantResolution.status,
      })
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const body = await request.json()
    const { firstName, lastName, email, phone, jobTitle, linkedinUrl, companyName, source, notes } = body

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        tenantId: context.tenantId,
        firstName,
        lastName,
        email,
        emails: [email],
        phone,
        phones: phone ? [phone] : [],
        jobTitle,
        linkedinUrl,
        companyName,
        source,
        notes,
      },
    })

    logTenantRequest('dashboard.crm.contacts.create.success', context, {
      contactId: contact.id,
    })

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
