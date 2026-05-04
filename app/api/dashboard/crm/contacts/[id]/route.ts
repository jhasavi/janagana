import { NextRequest, NextResponse } from 'next/server'
import { logTenantRequest, resolveDashboardTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

const SYSTEM_ARCHIVE_TAG = '__system_archived'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      console.warn('[dashboard-crm-contact-put] tenant resolution failed', {
        route: tenantResolution.route,
        authPrincipal: tenantResolution.authPrincipal,
        status: tenantResolution.status,
      })
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { id } = await params
    const body = await request.json()
    const { firstName, lastName, email, phone, jobTitle, linkedinUrl, companyName, source, notes } = body

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: { id, tenantId: context.tenantId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check if email is being changed and if new email already exists
    if (email !== contact.email) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          tenantId: context.tenantId,
          email,
          id: { not: id },
        },
      })

      if (existingContact) {
        return NextResponse.json({ error: 'Contact with this email already exists' }, { status: 409 })
      }
    }

    // Update contact
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        emails: email ? [email] : [],
        phone,
        phones: phone ? [phone] : [],
        jobTitle,
        linkedinUrl,
        companyName,
        source,
        notes,
      },
    })

    logTenantRequest('dashboard.crm.contacts.update.success', context, {
      contactId: id,
    })

    return NextResponse.json({ success: true, contact: updatedContact })
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      console.warn('[dashboard-crm-contact-delete] tenant resolution failed', {
        route: tenantResolution.route,
        authPrincipal: tenantResolution.authPrincipal,
        status: tenantResolution.status,
      })
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { id } = await params

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: { id, tenantId: context.tenantId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const archivedTags = Array.from(new Set([...(contact.tags ?? []), SYSTEM_ARCHIVE_TAG]))

    await prisma.contact.update({
      where: { id },
      data: {
        tags: archivedTags,
      },
    })

    logTenantRequest('dashboard.crm.contacts.archive.success', context, {
      contactId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error archiving contact:', error)
    return NextResponse.json({ error: 'Failed to archive contact' }, { status: 500 })
  }
}
