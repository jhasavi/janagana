import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPluginApiKey } from '@/lib/plugin-auth'
import { syncEventRegistrationToActivity } from '@/lib/crm-sync'

// POST /api/plugin/event-registrations - Register for event
export async function POST(request: NextRequest) {
  try {
    const tenant = await verifyPluginApiKey(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, email, firstName, lastName, phone } = body

    if (!eventId || !email) {
      return NextResponse.json(
        { error: 'eventId and email are required' },
        { status: 400 }
      )
    }

    // Verify event exists and belongs to tenant
    const event = await prisma.event.findFirst({
      where: { 
        id: eventId,
        tenantId: tenant.id,
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Find or create member
    let member = await prisma.member.findFirst({
      where: { 
        tenantId: tenant.id,
        email 
      },
    })

    if (!member) {
      member = await prisma.member.create({
        data: {
          tenantId: tenant.id,
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          phone,
          status: 'ACTIVE',
        },
      })
    }

    // Create registration with conflict handling
    let registration
    try {
      registration = await prisma.eventRegistration.create({
        data: {
          eventId,
          memberId: member.id,
          status: 'CONFIRMED',
        },
        include: {
          event: true,
          member: true,
        },
      })
    } catch (error: any) {
      // Handle unique constraint violation (already registered)
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Already registered for this event' },
          { status: 409 }
        )
      }
      throw error
    }

    // Sync to CRM activity (non-blocking)
    try {
      await syncEventRegistrationToActivity(registration.id)
    } catch (error) {
      console.error('[event registration] Failed to sync to CRM activity:', error)
      // Don't fail the request if CRM sync fails
    }

    return NextResponse.json(registration, { status: 201 })
  } catch (error) {
    console.error('Plugin event registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register for event' },
      { status: 500 }
    )
  }
}
