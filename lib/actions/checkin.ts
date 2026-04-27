'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

// Check in a member by scanning their ticketCode
export async function checkInByTicketCode(ticketCode: string) {
  try {
    const tenant = await requireTenant()

    const registration = await prisma.eventRegistration.findFirst({
      where: {
        ticketCode,
        event: { tenantId: tenant.id },
      },
      include: {
        member: { select: { firstName: true, lastName: true, email: true } },
        event: { select: { id: true, title: true } },
      },
    })

    if (!registration) {
      return { success: false, error: 'Ticket code not found' }
    }

    if (registration.status === 'CANCELED') {
      return { success: false, error: 'Registration was canceled' }
    }

    if (registration.status === 'ATTENDED') {
      return {
        success: false,
        error: `${registration.member.firstName} ${registration.member.lastName} is already checked in`,
        data: registration,
      }
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { status: 'ATTENDED' },
      include: {
        member: { select: { firstName: true, lastName: true, email: true } },
        event: { select: { id: true, title: true } },
      },
    })

    revalidatePath(`/dashboard/events/${registration.event.id}`)
    revalidatePath(`/dashboard/events/${registration.event.id}/checkin`)

    return { success: true, data: updated }
  } catch (error) {
    console.error('[checkInByTicketCode]', error)
    return { success: false, error: 'Check-in failed' }
  }
}

// Mark a registration as attended by registration ID
export async function markAttended(registrationId: string) {
  try {
    const tenant = await requireTenant()

    const reg = await prisma.eventRegistration.findFirst({
      where: { id: registrationId, event: { tenantId: tenant.id } },
      include: { event: { select: { id: true } } },
    })

    if (!reg) return { success: false, error: 'Registration not found' }

    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status: 'ATTENDED' },
    })

    revalidatePath(`/dashboard/events/${reg.event.id}`)
    revalidatePath(`/dashboard/events/${reg.event.id}/checkin`)

    return { success: true }
  } catch (error) {
    console.error('[markAttended]', error)
    return { success: false, error: 'Failed to mark attended' }
  }
}

// Undo check-in — revert to CONFIRMED
export async function undoCheckIn(registrationId: string) {
  try {
    const tenant = await requireTenant()

    const reg = await prisma.eventRegistration.findFirst({
      where: { id: registrationId, event: { tenantId: tenant.id } },
      include: { event: { select: { id: true } } },
    })

    if (!reg) return { success: false, error: 'Registration not found' }

    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status: 'CONFIRMED' },
    })

    revalidatePath(`/dashboard/events/${reg.event.id}`)
    revalidatePath(`/dashboard/events/${reg.event.id}/checkin`)

    return { success: true }
  } catch (error) {
    console.error('[undoCheckIn]', error)
    return { success: false, error: 'Failed to undo check-in' }
  }
}

// Get check-in summary for an event
export async function getCheckInSummary(eventId: string) {
  try {
    const tenant = await requireTenant()

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId: tenant.id },
      include: {
        registrations: {
          where: { status: { not: 'CANCELED' } },
          include: {
            member: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
          },
          orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    if (!event) return { success: false, error: 'Event not found', data: null }

    return { success: true, data: event }
  } catch (error) {
    console.error('[getCheckInSummary]', error)
    return { success: false, error: 'Failed to load event', data: null }
  }
}
