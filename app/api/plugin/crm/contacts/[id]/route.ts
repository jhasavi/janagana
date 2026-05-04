import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolvePluginTenantContext } from '@/lib/plugin-auth'
import { logTenantRequest } from '@/lib/tenant'

// PATCH /api/plugin/crm/contacts/[id] - Update contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantResolution = await resolvePluginTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { id: contactId } = await params
    const body = await request.json()
    const {
      firstName,
      lastName,
      emails,
      phones,
      phone,
      jobTitle,
      linkedinUrl,
      avatarUrl,
      companyId,
      source,
      lifecycleStage,
      tags,
      notes,
    } = body

    // Verify contact belongs to tenant
    const existingContact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId: context.tenantId },
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
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

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(emails && { emails }),
        ...(phones && { phones }),
        ...(phone && { phone }),
        ...(jobTitle && { jobTitle }),
        ...(linkedinUrl && { linkedinUrl }),
        ...(avatarUrl && { avatarUrl }),
        ...(companyId && { companyId }),
        ...(source && { source }),
        ...(lifecycleStage && { lifecycleStage }),
        ...(tags && { tags }),
        ...(notes && { notes }),
      },
      include: {
        company: true,
        member: true,
      },
    })

    logTenantRequest('plugin.crm.contacts.update.success', context, {
      contactId,
      companyId: companyId ?? null,
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('CRM update contact error:', error)
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}

// DELETE /api/plugin/crm/contacts/[id] - Delete contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantResolution = await resolvePluginTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { id: contactId } = await params

    // Verify contact belongs to tenant
    const existingContact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId: context.tenantId },
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await prisma.contact.delete({
      where: { id: contactId },
    })

    logTenantRequest('plugin.crm.contacts.delete.success', context, {
      contactId,
    })

    return NextResponse.json({ message: 'Contact deleted successfully' })
  } catch (error) {
    console.error('CRM delete contact error:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}
