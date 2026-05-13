import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolvePluginTenantContext } from '@/lib/plugin-auth'
import { syncEventRegistrationToActivity } from '@/lib/crm-sync'
import { logTenantRequest } from '@/lib/tenant'

// GET /api/plugin/event-registrations?eventId=xxx - List registrations for an event
export async function GET(request: NextRequest) {
  try {
    const tenantResolution = await resolvePluginTenantContext(request)
    if (!tenantResolution.ok) {
      return NextResponse.json({ error: tenantResolution.error }, { status: tenantResolution.status })
    }
    const context = tenantResolution.context

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    const where: Record<string, unknown> = { event: { tenantId: context.tenantId } }
    if (eventId) where.eventId = eventId

    const registrations = await prisma.eventRegistration.findMany({
      where,
      include: { member: { select: { id: true, firstName: true, lastName: true, email: true } }, event: { select: { id: true, title: true, startDate: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    logTenantRequest('plugin.event_registrations.list.success', context, { eventId: eventId ?? 'all', count: registrations.length })
    return NextResponse.json({ registrations })
  } catch (error) {
    console.error('Plugin event-registrations GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 })
  }
}

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
      include: { _count: { select: { registrations: true } } },
    })

    if (!event || event.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (event.capacity && event._count.registrations >= event.capacity) {
      return NextResponse.json(
        { error: 'Event is at capacity' },
        { status: 409 }
      )
    }

    // Find or create member
    const normalizedEmail = email.trim().toLowerCase()
    let member = await prisma.member.findFirst({
      where: {
        tenantId: context.tenantId,
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
    })

    if (!member) {
      member = await prisma.member.create({
        data: {
          tenantId: context.tenantId,
          email: normalizedEmail,
          firstName: firstName?.trim() || '',
          lastName: lastName?.trim() || '',
          phone: phone?.trim() || null,
          status: 'ACTIVE',
        },
      })
    } else {
      // Keep member contact details up to date for plugin registration sources.
      await prisma.member.update({
        where: { id: member.id },
        data: {
          firstName: firstName?.trim() || member.firstName,
          lastName: lastName?.trim() || member.lastName,
          phone: phone?.trim() || member.phone,
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
