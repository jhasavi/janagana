'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { ensureContactForMember } from '@/lib/contact-linking'

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const OpportunitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  date: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional().nullable(),
  hoursEstimate: z.number().positive().optional().nullable(),
  status: z.enum(['OPEN', 'CLOSED', 'CANCELED', 'COMPLETED']).default('OPEN'),
  tags: z.array(z.string()).default([]),
})

// ─── OPPORTUNITY ACTIONS ─────────────────────────────────────────────────────

export async function getOpportunities(params?: {
  search?: string
  status?: string
}) {
  try {
    const tenant = await requireTenant()

    const where: Record<string, unknown> = { tenantId: tenant.id }

    if (params?.status && params.status !== 'all') {
      where.status = params.status
    }
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { location: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const opportunities = await prisma.volunteerOpportunity.findMany({
      where,
      include: {
        _count: { select: { signups: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
    })

    return { success: true, data: opportunities }
  } catch (error) {
    console.error('[getOpportunities]', error)
    return { success: false, error: 'Failed to load opportunities', data: [] }
  }
}

export async function getOpportunity(id: string) {
  try {
    const tenant = await requireTenant()

    const opportunity = await prisma.volunteerOpportunity.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        signups: {
          include: { member: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { signups: true } },
      },
    })

    if (!opportunity) {
      return { success: false, error: 'Opportunity not found', data: null }
    }
    return { success: true, data: opportunity }
  } catch (error) {
    console.error('[getOpportunity]', error)
    return { success: false, error: 'Failed to load opportunity', data: null }
  }
}

export async function createOpportunity(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = OpportunitySchema.parse(input)

    const opportunity = await prisma.volunteerOpportunity.create({
      data: {
        ...data,
        tenantId: tenant.id,
        date: data.date ? new Date(data.date) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        capacity: data.capacity ?? null,
        hoursEstimate: data.hoursEstimate ?? null,
      },
    })

    revalidatePath('/dashboard/volunteers')
    return { success: true, data: opportunity }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('[createOpportunity]', error)
    return { success: false, error: 'Failed to create opportunity' }
  }
}

export async function updateOpportunity(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = OpportunitySchema.parse(input)

    const opportunity = await prisma.volunteerOpportunity.update({
      where: { id, tenantId: tenant.id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        capacity: data.capacity ?? null,
        hoursEstimate: data.hoursEstimate ?? null,
      },
    })

    revalidatePath('/dashboard/volunteers')
    revalidatePath(`/dashboard/volunteers/${id}`)
    return { success: true, data: opportunity }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('[updateOpportunity]', error)
    return { success: false, error: 'Failed to update opportunity' }
  }
}

export async function deleteOpportunity(id: string) {
  try {
    const tenant = await requireTenant()

    await prisma.volunteerOpportunity.delete({
      where: { id, tenantId: tenant.id },
    })

    revalidatePath('/dashboard/volunteers')
    return { success: true }
  } catch (error) {
    console.error('[deleteOpportunity]', error)
    return { success: false, error: 'Failed to delete opportunity' }
  }
}

// ─── SIGNUP ACTIONS ──────────────────────────────────────────────────────────

export async function signUpForOpportunity(opportunityId: string, memberId: string) {
  try {
    const tenant = await requireTenant()

    // Verify both belong to tenant
    const [opportunity, member] = await Promise.all([
      prisma.volunteerOpportunity.findFirst({
        where: { id: opportunityId, tenantId: tenant.id },
      }),
      prisma.member.findFirst({ where: { id: memberId, tenantId: tenant.id } }),
    ])

    if (!opportunity) return { success: false, error: 'Opportunity not found' }
    if (!member) return { success: false, error: 'Member not found' }

    const contact = await ensureContactForMember({
      id: member.id,
      tenantId: member.tenantId,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone,
      address: member.address,
      city: member.city,
      state: member.state,
      postalCode: member.postalCode,
      country: member.country,
    })

    // Check capacity
    if (opportunity.capacity) {
      const count = await prisma.volunteerSignup.count({
        where: { opportunityId, status: { in: ['CONFIRMED', 'COMPLETED'] } },
      })
      if (count >= opportunity.capacity) {
        return { success: false, error: 'Opportunity is at full capacity' }
      }
    }

    const signup = await prisma.volunteerSignup.upsert({
      where: { opportunityId_memberId: { opportunityId, memberId } },
      create: { opportunityId, memberId, contactId: contact.id, status: 'CONFIRMED' },
      update: { status: 'CONFIRMED', contactId: contact.id },
    })

    revalidatePath(`/dashboard/volunteers/${opportunityId}`)
    return { success: true, data: signup }
  } catch (error) {
    console.error('[signUpForOpportunity]', error)
    return { success: false, error: 'Failed to sign up member' }
  }
}

export async function logVolunteerHours(
  signupId: string,
  hoursLogged: number
) {
  try {
    const tenant = await requireTenant()

    const signup = await prisma.volunteerSignup.findFirst({
      where: { id: signupId },
      include: { opportunity: true },
    })

    if (!signup || signup.opportunity.tenantId !== tenant.id) {
      return { success: false, error: 'Signup not found' }
    }

    const updated = await prisma.volunteerSignup.update({
      where: { id: signupId },
      data: {
        hoursLogged,
        hoursStatus: 'PENDING',
        status: 'COMPLETED',
      },
    })

    revalidatePath(`/dashboard/volunteers/${signup.opportunityId}`)
    return { success: true, data: updated }
  } catch (error) {
    console.error('[logVolunteerHours]', error)
    return { success: false, error: 'Failed to log hours' }
  }
}

export async function approveVolunteerHours(signupId: string) {
  try {
    const tenant = await requireTenant()

    const signup = await prisma.volunteerSignup.findFirst({
      where: { id: signupId },
      include: { opportunity: true, member: true },
    })

    if (!signup || signup.opportunity.tenantId !== tenant.id) {
      return { success: false, error: 'Signup not found' }
    }

    const updated = await prisma.volunteerSignup.update({
      where: { id: signupId },
      data: {
        hoursApproved: signup.hoursLogged,
        hoursStatus: 'APPROVED',
      },
    })

    revalidatePath(`/dashboard/volunteers/${signup.opportunityId}`)
    return { success: true, data: updated }
  } catch (error) {
    console.error('[approveVolunteerHours]', error)
    return { success: false, error: 'Failed to approve hours' }
  }
}

export async function rejectVolunteerHours(signupId: string) {
  try {
    const tenant = await requireTenant()

    const signup = await prisma.volunteerSignup.findFirst({
      where: { id: signupId },
      include: { opportunity: true },
    })

    if (!signup || signup.opportunity.tenantId !== tenant.id) {
      return { success: false, error: 'Signup not found' }
    }

    const updated = await prisma.volunteerSignup.update({
      where: { id: signupId },
      data: { hoursStatus: 'REJECTED' },
    })

    revalidatePath(`/dashboard/volunteers/${signup.opportunityId}`)
    return { success: true, data: updated }
  } catch (error) {
    console.error('[rejectVolunteerHours]', error)
    return { success: false, error: 'Failed to reject hours' }
  }
}

export async function cancelSignup(signupId: string) {
  try {
    const tenant = await requireTenant()

    const signup = await prisma.volunteerSignup.findFirst({
      where: { id: signupId },
      include: { opportunity: true },
    })

    if (!signup || signup.opportunity.tenantId !== tenant.id) {
      return { success: false, error: 'Signup not found' }
    }

    await prisma.volunteerSignup.update({
      where: { id: signupId },
      data: { status: 'CANCELED' },
    })

    revalidatePath(`/dashboard/volunteers/${signup.opportunityId}`)
    return { success: true }
  } catch (error) {
    console.error('[cancelSignup]', error)
    return { success: false, error: 'Failed to cancel signup' }
  }
}

// ─── VOLUNTEER SHIFTS ─────────────────────────────────────────────────────────

export async function getShifts(opportunityId: string) {
  try {
    const tenant = await requireTenant()
    // verify opportunity belongs to tenant
    const opp = await prisma.volunteerOpportunity.findFirst({
      where: { id: opportunityId, tenantId: tenant.id },
    })
    if (!opp) return { success: false, error: 'Not found', data: [] }
    const shifts = await prisma.volunteerShift.findMany({
      where: { opportunityId },
      include: { signups: true, _count: { select: { signups: true } } },
      orderBy: { startTime: 'asc' },
    })
    return { success: true, data: shifts }
  } catch (e) {
    console.error('[getShifts]', e)
    return { success: false, error: 'Failed to load shifts', data: [] }
  }
}

const ShiftSchema = z.object({
  title: z.string().max(200).optional(),
  startTime: z.string().min(1, 'Start time required'),
  endTime: z.string().min(1, 'End time required'),
  capacity: z.number().int().positive().optional().nullable(),
  location: z.string().optional(),
})

export async function createShift(opportunityId: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const opp = await prisma.volunteerOpportunity.findFirst({
      where: { id: opportunityId, tenantId: tenant.id },
    })
    if (!opp) return { success: false, error: 'Not found' }
    const data = ShiftSchema.parse(input)
    const shift = await prisma.volunteerShift.create({
      data: {
        opportunityId,
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    })
    revalidatePath(`/dashboard/volunteers/${opportunityId}`)
    return { success: true, data: shift }
  } catch (e) {
    console.error('[createShift]', e)
    return { success: false, error: 'Failed to create shift' }
  }
}

export async function deleteShift(opportunityId: string, shiftId: string) {
  try {
    const tenant = await requireTenant()
    const opp = await prisma.volunteerOpportunity.findFirst({
      where: { id: opportunityId, tenantId: tenant.id },
    })
    if (!opp) return { success: false, error: 'Not found' }
    const deletedCount = await prisma.volunteerShift.deleteMany({
      where: { id: shiftId, opportunity: { tenantId: tenant.id } },
    })
    if (deletedCount.count === 0) return { success: false, error: 'Not found' }
    revalidatePath(`/dashboard/volunteers/${opportunityId}`)
    return { success: true }
  } catch (e) {
    console.error('[deleteShift]', e)
    return { success: false, error: 'Failed to delete shift' }
  }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

export async function getVolunteerStats() {
  try {
    const tenant = await requireTenant()

    const [totalOpportunities, openOpportunities, totalSignups, totalHours] =
      await Promise.all([
        prisma.volunteerOpportunity.count({ where: { tenantId: tenant.id } }),
        prisma.volunteerOpportunity.count({
          where: { tenantId: tenant.id, status: 'OPEN' },
        }),
        prisma.volunteerSignup.count({
          where: { opportunity: { tenantId: tenant.id } },
        }),
        prisma.volunteerSignup.aggregate({
          where: {
            opportunity: { tenantId: tenant.id },
            hoursLogged: { not: null },
          },
          _sum: { hoursLogged: true },
        }),
      ])

    return {
      success: true,
      data: {
        totalOpportunities,
        openOpportunities,
        totalSignups,
        totalHours: totalHours._sum.hoursLogged ?? 0,
      },
    }
  } catch (error) {
    console.error('[getVolunteerStats]', error)
    return { success: false, error: 'Failed to load stats', data: null }
  }
}
