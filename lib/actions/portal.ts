'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { syncEventRegistrationToActivity, syncVolunteerSignupToActivity } from '@/lib/crm-sync'
import type { Member, MembershipTier, Tenant, EventRegistration, Event, VolunteerSignup, VolunteerOpportunity } from '@prisma/client'

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

export async function portalRegisterForEvent(slug: string, eventId: string) {
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
    if (event.capacity && event._count.registrations >= event.capacity) {
      return { success: false, error: 'Event is at capacity' }
    }

    const reg = await prisma.eventRegistration.create({
      data: { eventId, memberId: ctx.member.id, status: 'CONFIRMED' },
    })

    // Sync to CRM
    try {
      await syncEventRegistrationToActivity(reg.id)
    } catch (error) {
      console.error('[portalRegisterForEvent] Failed to sync to CRM:', error)
      // Don't fail the registration if CRM sync fails
    }

    return { success: true, data: reg }
  } catch (e) {
    console.error('[portalRegisterForEvent]', e)
    return { success: false, error: 'Registration failed' }
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
