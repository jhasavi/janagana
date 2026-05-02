import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPluginApiKey } from '@/lib/plugin-auth'

// PATCH /api/plugin/crm/contacts/[id] - Update contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      where: { id: contactId, tenantId: tenant.id },
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
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
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: contactId } = await params

    // Verify contact belongs to tenant
    const existingContact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId: tenant.id },
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await prisma.contact.delete({
      where: { id: contactId },
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
