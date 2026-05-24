'use server'

import { z } from 'zod'
import { getCurrentIdentity } from '@/lib/auth/auth-provider'
import { prisma } from '@/lib/prisma'
import { syncEventRegistrationToActivity, syncVolunteerSignupToActivity } from '@/lib/crm-sync'
import type {
  Member,
  MembershipTier,
  Tenant,
  EventRegistration,
  Event,
  EventTicketType,
  VolunteerSignup,
  VolunteerOpportunity,
  Contact,
} from '@prisma/client'
import {
  sendEventCancellationRequestEmail,
  sendEventRegistrationConfirmationEmail,
  sendMemberJoinConfirmationEmail,
  sendWaitlistPromotionEmail,
} from '@/lib/email'
import { getTenantProfile } from '@/lib/tenant-profile'

const CAPACITY_REGISTRATION_STATUSES: Array<'CONFIRMED' | 'ATTENDED'> = ['CONFIRMED', 'ATTENDED']

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export type PortalContext = {
  tenant: Tenant
  member: Member & {
    tier: MembershipTier | null
    eventRegistrations: (EventRegistration & { event: Pick<Event, 'title' | 'startDate'> | null })[]
    volunteerSignups: (VolunteerSignup & { opportunity: Pick<VolunteerOpportunity, 'title'> | null })[]
    contact: (Contact & {
      household?: { contacts: Contact[] } | null
    }) | null
  }
}

/**
 * Get authenticated user's Member record for a given org slug.
 * Works in both Clerk and test-auth modes.
 * Tenant is resolved by URL slug — never by dashboard active-org cookies.
 */
export async function getPortalContext(slug: string): Promise<PortalContext | null> {
  const identity = await getCurrentIdentity()
  if (!identity.userId || !identity.email) return null

  const userId = identity.userId
  const primaryEmail = identity.email

  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) return null

  const member = await prisma.member.findFirst({
    where: {
      tenantId: tenant.id,
      email: { equals: primaryEmail, mode: 'insensitive' },
    },
    include: {
      tier: true,
      eventRegistrations: {
        include: { event: { select: { title: true, startDate: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      volunteerSignups: {
        include: { opportunity: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  let contact: (Contact & { household?: { contacts: Contact[] } | null }) | null = null
  if (member) {
    contact = await prisma.contact.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { emails: { has: member.email } },
          { email: { equals: member.email, mode: 'insensitive' } },
          member.clerkUserId ? { clerkUserId: member.clerkUserId } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        household: { include: { contacts: true } },
      },
    })
  }

  if (!member) return null

  // Persist clerkUserId on first portal login (Clerk mode only)
  if (!member.clerkUserId && identity.mode === 'clerk') {
    await prisma.member.update({
      where: { id: member.id, tenantId: tenant.id },
      data: { clerkUserId: userId },
    })
  }

  return {
    tenant,
    member: { ...member, tier: member.tier ?? null, contact },
  }
}

// ─── PORTAL EVENTS ───────────────────────────────────────────────────────────

export async function getPortalEvents(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) return { success: false, error: 'Not found', data: [] }

  const events = await prisma.event.findMany({
    where: {
      tenantId: tenant.id,
      status: 'PUBLISHED',
      startDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    include: {
      _count: {
        select: {
          registrations: {
            where: { status: { in: CAPACITY_REGISTRATION_STATUSES } },
          },
        },
      },
      ticketTypes: {
        where: { isActive: true },
        orderBy: { priceCents: 'asc' },
      },
    },
    orderBy: { startDate: 'asc' },
  })
  return { success: true, data: events }
}

// ─── PORTAL VOLUNTEER OPPORTUNITIES ──────────────────────────────────────────

export async function getPortalOpportunities(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) return { success: false, error: 'Not found', data: [] }

  const opps = await prisma.volunteerOpportunity.findMany({
    where: { tenantId: tenant.id, status: 'OPEN' },
    include: { _count: { select: { signups: true } } },
    orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
  })
  return { success: true, data: opps }
}

// ─── PORTAL SELF-REGISTER FOR EVENT ──────────────────────────────────────────

export async function portalRegisterForEvent(slug: string, eventId: string, joinWaitlist = false, ticketTypeId?: string) {
  try {
    const ctx = await getPortalContext(slug)
    if (!ctx) return { success: false, error: 'Not authorized' }

    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId, memberId: ctx.member.id },
    })
    if (existing) return { success: false, error: 'Already registered' }

    const ticketType = ticketTypeId
      ? await prisma.eventTicketType.findFirst({
          where: { id: ticketTypeId, eventId, tenantId: ctx.tenant.id, isActive: true },
        })
      : null

    if (ticketTypeId && !ticketType) {
      return { success: false, error: 'Selected ticket option is not available' }
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId: ctx.tenant.id },
      select: { id: true, title: true, startDate: true, location: true, capacity: true },
    })
    if (!event) return { success: false, error: 'Event not found' }

    if (ticketType?.quantityLimit != null) {
      const typeCount = await prisma.eventRegistration.count({
        where: {
          eventId,
          ticketTypeId: ticketTypeId,
          status: { in: CAPACITY_REGISTRATION_STATUSES },
        },
      })
      if (typeCount >= ticketType.quantityLimit) {
        return { success: false, error: 'Selected ticket type is sold out' }
      }
    }

    const confirmedCount = await prisma.eventRegistration.count({
      where: { eventId, status: { in: CAPACITY_REGISTRATION_STATUSES } },
    })
    const isFull = !!event.capacity && confirmedCount >= event.capacity
    if (isFull && !joinWaitlist) {
      return { success: false, error: 'Event is at capacity', waitlistAvailable: true }
    }

    const status = isFull ? 'WAITLISTED' : 'CONFIRMED'

    const reg = await prisma.eventRegistration.create({
      data: { eventId, memberId: ctx.member.id, status, ticketTypeId },
      select: { id: true, ticketCode: true },
    })

    // Sync to CRM (only for confirmed registrations)
    if (status === 'CONFIRMED') {
      try {
        await syncEventRegistrationToActivity(reg.id)
      } catch (error) {
        console.error('[portalRegisterForEvent] Failed to sync to CRM:', error)
      }
    }

    try {
      const profile = getTenantProfile()
      await sendEventRegistrationConfirmationEmail({
        to: ctx.member.email,
        firstName: ctx.member.firstName,
        orgName: ctx.tenant.name,
        eventTitle: event.title,
        eventDate: event.startDate,
        eventLocation: event.location,
        portalUrl: `${profile.baseUrls.app}/portal/${slug}/events#event-${event.id}`,
        status,
        ticketCode: reg.ticketCode,
      })
    } catch (emailError) {
      console.error('[portalRegisterForEvent] confirmation email error', emailError)
    }

    return { success: true, data: reg, waitlisted: status === 'WAITLISTED' }
  } catch (e) {
    console.error('[portalRegisterForEvent]', e)
    return { success: false, error: 'Registration failed' }
  }
}

export async function portalCancelEventRegistration(slug: string, eventId: string) {
  try {
    const ctx = await getPortalContext(slug)
    if (!ctx) return { success: false, error: 'Not authorized' }

    const reg = await prisma.eventRegistration.findFirst({
      where: { eventId, memberId: ctx.member.id, status: 'CONFIRMED' },
    })
    if (!reg) return { success: false, error: 'No confirmed registration found' }

    const isPaid = reg.paidAmount > 0 || Boolean(reg.stripePaymentId)
    if (isPaid) {
      const existingRequest = await prisma.eventCancellationRequest.findFirst({
        where: { registrationId: reg.id, status: { in: ['REQUESTED', 'APPROVED'] } },
      })
      if (existingRequest) {
        return { success: false, error: 'A cancellation request is already pending for this registration.' }
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } })

      const cancellationRequest = await prisma.eventCancellationRequest.create({
        data: {
          tenantId: ctx.tenant.id,
          registrationId: reg.id,
          eventId: reg.eventId,
          memberId: ctx.member.id,
          stripePaymentId: reg.stripePaymentId || undefined,
          reason: `Member requested cancellation for paid registration`,
          status: 'REQUESTED',
        },
      })

      await prisma.notification.create({
        data: {
          tenantId: ctx.tenant.id,
          title: 'Paid event cancellation request received',
          body: `A paid cancellation request for ${event?.title ?? 'an event'} was submitted by ${ctx.member.firstName ?? ''} ${ctx.member.lastName ?? ''} (${ctx.member.email}).`,
          type: 'INFO',
          resourceType: 'EventCancellationRequest',
          resourceId: cancellationRequest.id,
          actionUrl: `/dashboard/events/${eventId}`,
        },
      })

      try {
        const profile = getTenantProfile()
        await sendEventCancellationRequestEmail({
          to: ctx.member.email,
          firstName: ctx.member.firstName,
          orgName: ctx.tenant.name,
          eventTitle: event?.title ?? 'your event',
          portalUrl: `${profile.baseUrls.app}/portal/${slug}/events#event-${eventId}`,
        })
      } catch (emailError) {
        console.error('[portalCancelEventRegistration] cancellation email error', emailError)
      }

      return {
        success: true,
        status: 'requested',
        message: 'Cancellation request submitted. An administrator will review it shortly.',
      }
    }

    await prisma.eventRegistration.update({
      where: { id: reg.id },
      data: { status: 'CANCELED' },
    })

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (event?.capacity) {
      const waitlisted = await prisma.eventRegistration.findFirst({
        where: { eventId, status: 'WAITLISTED' },
        orderBy: { createdAt: 'asc' },
      })
      if (waitlisted) {
        const promoted = await prisma.eventRegistration.update({
          where: { id: waitlisted.id },
          data: { status: 'CONFIRMED' },
          select: { id: true, ticketCode: true, member: { select: { email: true, firstName: true } } },
        })
        syncEventRegistrationToActivity(promoted.id).catch((err) =>
          console.error('[portalCancelEventRegistration] CRM sync error', err)
        )

        try {
          const profile = getTenantProfile()
          await sendWaitlistPromotionEmail({
            to: promoted.member.email,
            firstName: promoted.member.firstName,
            orgName: ctx.tenant.name,
            eventTitle: event.title,
            eventDate: event.startDate,
            eventLocation: event.location,
            ticketCode: promoted.ticketCode,
            portalUrl: `${profile.baseUrls.app}/portal/${slug}/events#event-${event.id}`,
          })
        } catch (emailError) {
          console.error('[portalCancelEventRegistration] waitlist promotion email error', emailError)
        }
      }
    }

    return { success: true }
  } catch (e) {
    console.error('[portalCancelEventRegistration]', e)
    return { success: false, error: 'Cancellation failed' }
  }
}

export async function getPortalEventCancellationRequests(memberId: string, tenantId: string) {
  try {
    const requests = await prisma.eventCancellationRequest.findMany({
      where: { memberId, tenantId },
      include: {
        event: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: requests }
  } catch (error) {
    console.error('[getPortalEventCancellationRequests]', error)
    return { success: false, error: 'Failed to load cancellation requests', data: [] }
  }
}

// ─── PORTAL VOLUNTEER SIGNUP ──────────────────────────────────────────────────

export async function portalSignupForVolunteer(slug: string, opportunityId: string) {
  try {
    const ctx = await getPortalContext(slug)
    if (!ctx) return { success: false, error: 'Not authorized' }

    const existing = await prisma.volunteerSignup.findFirst({
      where: { opportunityId, memberId: ctx.member.id },
    })
    if (existing) return { success: false, error: 'Already signed up' }

    const signup = await prisma.volunteerSignup.create({
      data: { opportunityId, memberId: ctx.member.id, status: 'CONFIRMED' },
    })

    // Sync to CRM
    try {
      await syncVolunteerSignupToActivity(signup.id)
    } catch (error) {
      console.error('[portalSignupForVolunteer] Failed to sync to CRM:', error)
      // Don't fail the signup if CRM sync fails
    }

    return { success: true, data: signup }
  } catch (e) {
    console.error('[portalSignupForVolunteer]', e)
    return { success: false, error: 'Sign-up failed' }
  }
}

// ─── PUBLIC JOIN REQUEST ──────────────────────────────────────────────────────

const JoinSchema = z.object({
  firstName: z.string().trim().min(1, 'First name required').max(100),
  lastName:  z.string().trim().min(1, 'Last name required').max(100),
  email:     z.string().trim().email('Valid email required'),
  phone:     z.string().max(30).optional(),
  tierId:    z.string().optional(),
  smsOptIn:  z.boolean().optional().default(false),
})

export async function getPublicTenantForJoin(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) return null

  const tiers = await prisma.membershipTier.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { priceCents: 'asc' },
    select: { id: true, name: true, priceCents: true, interval: true, description: true },
  })

  return { tenant: { name: tenant.name, slug: tenant.slug, primaryColor: tenant.primaryColor }, tiers }
}

export async function portalJoinRequest(slug: string, input: unknown) {
  try {
    const data = JoinSchema.parse(input)
    const normalizedEmail = data.email.trim().toLowerCase()
    const normalizedSlug = slug.trim().toLowerCase()

    const tenant = await prisma.tenant.findUnique({ where: { slug: normalizedSlug } })
    if (!tenant) return { success: false, error: 'Organization not found' }

    // Prevent duplicate
    const existing = await prisma.member.findFirst({
      where: { tenantId: tenant.id, email: { equals: normalizedEmail, mode: 'insensitive' } },
    })
    if (existing) {
      return { success: false, error: 'This email is already registered with this organization.' }
    }

    // Validate tier if provided
    let tierId: string | undefined
    if (data.tierId) {
      const tier = await prisma.membershipTier.findFirst({
        where: { id: data.tierId, tenantId: tenant.id, isActive: true },
      })
      tierId = tier?.id
    }

    const member = await prisma.member.create({
      data: {
        tenantId: tenant.id,
        email: normalizedEmail,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || null,
        tierId: tierId ?? null,
        status: 'PENDING',
        smsOptIn: Boolean(data.smsOptIn),
      },
    })

    // Send confirmation email (non-blocking)
    const profile = getTenantProfile()
    const portalUrl = `${profile.baseUrls.app}/portal/${normalizedSlug}`
    sendMemberJoinConfirmationEmail({
      to: normalizedEmail,
      firstName: data.firstName.trim(),
      orgName: tenant.name,
      portalUrl,
      isPending: true,
    }).catch((err) => console.error('[portalJoinRequest] email error', err))

    return { success: true, data: { memberId: member.id } }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[portalJoinRequest]', e)
    return { success: false, error: 'Failed to submit join request' }
  }
}
