import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolvePluginTenantContext } from '@/lib/plugin-auth'
import { syncEventRegistrationToActivity } from '@/lib/crm-sync'
import { logTenantRequest } from '@/lib/tenant'

// POST /api/plugin/event-registrations - Register for event
export async function POST(request: NextRequest) {
  try {
    const tenantResolution = await resolvePluginTenantContext(request)
    if (!tenantResolution.ok) {
      console.warn('[plugin-event-registrations] tenant resolution failed', {
        route: tenantResolution.route,
        authPrincipal: tenantResolution.authPrincipal,
        status: tenantResolution.status,
      })
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

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
        tenantId: context.tenantId,
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
        tenantId: context.tenantId,
        email 
      },
    })

    if (!member) {
      member = await prisma.member.create({
        data: {
          tenantId: context.tenantId,
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

    logTenantRequest('plugin.event_registrations.create.success', context, {
      eventId,
      memberId: member.id,
      registrationId: registration.id,
    })

    return NextResponse.json(registration, { status: 201 })
  } catch (error) {
    console.error('Plugin event registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register for event' },
      { status: 500 }
    )
  }
}
