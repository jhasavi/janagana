import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { logTenantRequest, resolveDashboardTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { syncMemberToContact } from '@/lib/crm-sync'

export async function PUT(request: NextRequest) {
  try {
    const authState = await auth()
    if (!authState.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantResolution = await resolveDashboardTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const body = await request.json()
    const { firstName, lastName, phone, dateOfBirth, address, city, state, postalCode, country } = body

    // Get current user's email from Clerk
    const { currentUser } = await import('@clerk/nextjs/server')
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress
    if (!primaryEmail) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 })
    }

    // Find member by email and tenant
    const member = await prisma.member.findFirst({
      where: {
        tenantId: context.tenantId,
        email: { equals: primaryEmail, mode: 'insensitive' },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Update member
    const updatedMember = await prisma.member.update({
      where: { id: member.id },
      data: {
        firstName,
        lastName,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address,
        city,
        state,
        postalCode,
        country,
      },
    })

    // Sync to CRM
    try {
      await syncMemberToContact(member.id)
    } catch (error) {
      console.error('[member profile] Failed to sync to CRM:', error)
      // Don't fail the update if CRM sync fails
    }

    logTenantRequest('portal.member.profile.update.success', context, {
      memberId: member.id,
      email: primaryEmail,
    })

    return NextResponse.json({ success: true, member: updatedMember })
  } catch (error) {
    console.error('Error updating member profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
