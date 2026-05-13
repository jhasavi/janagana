'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { syncEventRegistrationToActivity, syncVolunteerSignupToActivity } from '@/lib/crm-sync'
import type { Member, MembershipTier, Tenant, EventRegistration, Event, VolunteerSignup, VolunteerOpportunity } from '@prisma/client'
import { sendMemberJoinConfirmationEmail } from '@/lib/email'
import { getTenantProfile } from '@/lib/tenant-profile'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export type PortalContext = {
  tenant: Tenant
  member: Member & {
    tier: MembershipTier | null
    eventRegistrations: (EventRegistration & { event: Pick<Event, 'title'> | null })[]
    volunteerSignups: (VolunteerSignup & { opportunity: Pick<VolunteerOpportunity, 'title'> | null })[]
  }
}

/**
 * Get current Clerk user's Member record for a given org slug.
 * Used in every portal server component.
 */
export async function getPortalContext(slug: string): Promise<PortalContext | null> {
  const { userId } = await auth()
  if (!userId) return null

  // Get Clerk user email
  const user = await currentUser()
  if (!user) return null

  const primaryEmail = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress
  if (!primaryEmail) return null

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
        include: { event: { select: { title: true } } },
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

  if (!member) return null

  // Persist clerkUserId on first portal login
  if (!member.clerkUserId) {
    await prisma.member.update({
      where: { id: member.id, tenantId: tenant.id },
      data: { clerkUserId: userId },
    })
  }

  return { tenant, member: { ...member, tier: member.tier ?? null } }
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
    include: { _count: { select: { registrations: true } } },
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

export async function portalRegisterForEvent(slug: string, eventId: string, joinWaitlist = false) {
  try {
    const ctx = await getPortalContext(slug)
    if (!ctx) return { success: false, error: 'Not authorized' }

    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId, memberId: ctx.member.id },
    })
    if (existing) return { success: false, error: 'Already registered' }

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId: ctx.tenant.id },
      include: { _count: { select: { registrations: true } } },
    })
    if (!event) return { success: false, error: 'Event not found' }

    const isFull = !!event.capacity && event._count.registrations >= event.capacity
    if (isFull && !joinWaitlist) {
      return { success: false, error: 'Event is at capacity', waitlistAvailable: true }
    }

    const status = isFull ? 'WAITLISTED' : 'CONFIRMED'

    const reg = await prisma.eventRegistration.create({
      data: { eventId, memberId: ctx.member.id, status },
    })

    // Sync to CRM (only for confirmed registrations)
    if (status === 'CONFIRMED') {
      try {
        await syncEventRegistrationToActivity(reg.id)
      } catch (error) {
        console.error('[portalRegisterForEvent] Failed to sync to CRM:', error)
      }
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

    await prisma.eventRegistration.delete({ where: { id: reg.id } })

    // Promote first waitlisted member if capacity freed
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (event?.capacity) {
      const waitlisted = await prisma.eventRegistration.findFirst({
        where: { eventId, status: 'WAITLISTED' },
        orderBy: { createdAt: 'asc' },
      })
      if (waitlisted) {
        await prisma.eventRegistration.update({
          where: { id: waitlisted.id },
          data: { status: 'CONFIRMED' },
        })
        // Fire-and-forget CRM sync for promoted member
        syncEventRegistrationToActivity(waitlisted.id).catch((err) =>
          console.error('[portalCancelEventRegistration] CRM sync error', err)
        )
      }
    }

    return { success: true }
  } catch (e) {
    console.error('[portalCancelEventRegistration]', e)
    return { success: false, error: 'Cancellation failed' }
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
  firstName: z.string().min(1, 'First name required').max(100),
  lastName:  z.string().min(1, 'Last name required').max(100),
  email:     z.string().email('Valid email required'),
  phone:     z.string().max(30).optional(),
  tierId:    z.string().optional(),
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

    const tenant = await prisma.tenant.findUnique({ where: { slug } })
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
      },
    })

    // Send confirmation email (non-blocking)
    const profile = getTenantProfile()
    const portalUrl = `${profile.baseUrls.app}/portal/${slug}`
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
