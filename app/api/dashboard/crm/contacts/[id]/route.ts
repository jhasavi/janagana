import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth()
    const tenant = await getTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const { firstName, lastName, email, phone, jobTitle, linkedinUrl, companyName, source, notes } = body

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: { id, tenantId: tenant.id },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check if email is being changed and if new email already exists
    if (email !== contact.email) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          tenantId: tenant.id,
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
        phone,
        jobTitle,
        linkedinUrl,
        companyName,
        source,
        notes,
      },
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
    const { orgId } = await auth()
    const tenant = await getTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { id } = await params

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: { id, tenantId: tenant.id },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Delete contact (cascade will delete related activities, deals, tasks)
    await prisma.contact.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
