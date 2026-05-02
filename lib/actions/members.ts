'use server'

import { revalidatePath } from 'next/cache'
import Papa from 'papaparse'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { sendMembershipRenewalReminder } from '@/lib/sms'
import { ensureContactForMember } from '@/lib/contact-linking'

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const MemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  smsOptIn: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'BANNED']).default('ACTIVE'),
  tierId: z.string().optional().nullable(),
  joinedAt: z.string().optional(),
  renewsAt: z.string().optional().nullable(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('US'),
  bio: z.string().optional(),
  notes: z.string().optional(),
})

const TierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  priceCents: z.number().int().min(0).default(0),
  interval: z.enum(['MONTHLY', 'ANNUAL']).default('ANNUAL'),
  color: z.string().default('#4F46E5'),
  benefits: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
})

async function syncEnrollmentForMember(member: {
  id: string
  tenantId: string
  tierId: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'BANNED'
  joinedAt: Date
  renewsAt: Date | null
  notes: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  chapterId: string | null
}, contactId: string) {
  const latest = await prisma.membershipEnrollment.findFirst({
    where: { tenantId: member.tenantId, contactId },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  })

  if (!latest) {
    await prisma.membershipEnrollment.create({
      data: {
        tenantId: member.tenantId,
        contactId,
        tierId: member.tierId,
        status: member.status,
        startDate: member.joinedAt,
        renewalDate: member.renewsAt,
        stripeCustomerId: member.stripeCustomerId,
        stripeSubscriptionId: member.stripeSubscriptionId,
        paymentStatus: member.stripeSubscriptionId ? 'active' : null,
        notes: member.notes,
        chapterId: member.chapterId,
      },
    })
    return
  }

  const tierChanged = latest.tierId !== member.tierId

  if (tierChanged && !latest.endDate) {
    await prisma.membershipEnrollment.update({
      where: { id: latest.id },
      data: { endDate: new Date(), status: member.status },
    })

    const newEnrollment = await prisma.membershipEnrollment.create({
      data: {
        tenantId: member.tenantId,
        contactId,
        tierId: member.tierId,
        status: member.status,
        startDate: new Date(),
        renewalDate: member.renewsAt,
        stripeCustomerId: member.stripeCustomerId,
        stripeSubscriptionId: member.stripeSubscriptionId,
        paymentStatus: member.stripeSubscriptionId ? 'active' : null,
        notes: member.notes,
        chapterId: member.chapterId,
      },
    })

    await prisma.membershipEnrollmentChange.create({
      data: {
        tenantId: member.tenantId,
        enrollmentId: newEnrollment.id,
        fromTierId: latest.tierId,
        toTierId: member.tierId,
        fromStatus: latest.status,
        toStatus: member.status,
        reason: 'tier-change via member update',
      },
    })
    return
  }

  await prisma.membershipEnrollment.update({
    where: { id: latest.id },
    data: {
      tierId: member.tierId,
      status: member.status,
      renewalDate: member.renewsAt,
      stripeCustomerId: member.stripeCustomerId,
      stripeSubscriptionId: member.stripeSubscriptionId,
      paymentStatus: member.stripeSubscriptionId ? 'active' : latest.paymentStatus,
      notes: member.notes,
      chapterId: member.chapterId,
    },
  })
}

async function hasDuplicateActiveEnrollment(params: {
  tenantId: string
  contactId: string
  tierId: string | null | undefined
  excludeEnrollmentId?: string
}) {
  const where: Record<string, unknown> = {
    tenantId: params.tenantId,
    contactId: params.contactId,
    status: 'ACTIVE',
    endDate: null,
    tierId: params.tierId ?? null,
  }

  if (params.excludeEnrollmentId) {
    where.NOT = { id: params.excludeEnrollmentId }
  }

  const existing = await prisma.membershipEnrollment.findFirst({
    where,
    select: { id: true },
  })

  return Boolean(existing)
}

// ─── MEMBER ACTIONS ──────────────────────────────────────────────────────────

export async function getMembers(params?: {
  search?: string
  status?: string
  tierId?: string
}) {
  try {
    const tenant = await requireTenant()

    const where: Record<string, unknown> = { tenantId: tenant.id }

    if (params?.status && params.status !== 'all') {
      where.status = params.status
    }
    if (params?.tierId && params.tierId !== 'all') {
      where.tierId = params.tierId
    }
    if (params?.search) {
      const q = params.search
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ]
    }

    const members = await prisma.member.findMany({
      where,
      include: { tier: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return { success: true, data: members }
  } catch (error) {
    console.error('[getMembers]', error)
    return { success: false, error: 'Failed to load members', data: [] }
  }
}

export async function getMember(id: string) {
  try {
    const tenant = await requireTenant()

    const member = await prisma.member.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        tier: true,
        eventRegistrations: {
          include: { event: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        volunteerSignups: {
          include: { opportunity: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!member) return { success: false, error: 'Member not found', data: null }
    return { success: true, data: member }
  } catch (error) {
    console.error('[getMember]', error)
    return { success: false, error: 'Failed to load member', data: null }
  }
}

export async function createMember(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = MemberSchema.parse(input)

    const existing = await prisma.member.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: data.email } },
    })
    if (existing) {
      return { success: false, error: 'A member with this email already exists' }
    }

    const existingContact = await prisma.contact.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { email: data.email.toLowerCase() },
          { emails: { has: data.email.toLowerCase() } },
        ],
      },
      select: { id: true },
    })

    if (existingContact && data.status === 'ACTIVE') {
      const hasDuplicate = await hasDuplicateActiveEnrollment({
        tenantId: tenant.id,
        contactId: existingContact.id,
        tierId: data.tierId,
      })

      if (hasDuplicate) {
        return {
          success: false,
          error: 'This contact already has an active membership enrollment with the same tier.',
        }
      }
    }

    const member = await prisma.member.create({
      data: {
        ...data,
        tenantId: tenant.id,
        joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date(),
        renewsAt: data.renewsAt ? new Date(data.renewsAt) : null,
        tierId: data.tierId || null,
      },
    })

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

    await syncEnrollmentForMember(member, contact.id)

    revalidatePath('/dashboard/members')
    return { success: true, data: member }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('[createMember]', error)
    return { success: false, error: 'Failed to create member' }
  }
}

export async function updateMember(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = MemberSchema.parse(input)

    // Check email uniqueness if changed
    const existing = await prisma.member.findFirst({
      where: {
        tenantId: tenant.id,
        email: data.email,
        NOT: { id },
      },
    })
    if (existing) {
      return { success: false, error: 'Another member with this email already exists' }
    }

    const member = await prisma.member.update({
      where: { id, tenantId: tenant.id },
      data: {
        ...data,
        joinedAt: data.joinedAt ? new Date(data.joinedAt) : undefined,
        renewsAt: data.renewsAt ? new Date(data.renewsAt) : null,
        tierId: data.tierId || null,
      },
    } as Parameters<typeof prisma.member.update>[0])

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

    if (member.status === 'ACTIVE') {
      const latest = await prisma.membershipEnrollment.findFirst({
        where: {
          tenantId: tenant.id,
          contactId: contact.id,
        },
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        select: { id: true },
      })

      const hasDuplicate = await hasDuplicateActiveEnrollment({
        tenantId: tenant.id,
        contactId: contact.id,
        tierId: member.tierId,
        excludeEnrollmentId: latest?.id,
      })

      if (hasDuplicate) {
        return {
          success: false,
          error: 'This contact already has an active membership enrollment with the same tier.',
        }
      }
    }

    await syncEnrollmentForMember(member, contact.id)

    revalidatePath('/dashboard/members')
    revalidatePath(`/dashboard/members/${id}`)
    return { success: true, data: member }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('[updateMember]', error)
    return { success: false, error: 'Failed to update member' }
  }
}

export async function deleteMember(id: string) {
  try {
    const tenant = await requireTenant()

    await prisma.member.delete({
      where: { id, tenantId: tenant.id },
    })

    revalidatePath('/dashboard/members')
    return { success: true }
  } catch (error) {
    console.error('[deleteMember]', error)
    return { success: false, error: 'Failed to delete member' }
  }
}

// ─── TIER ACTIONS ─────────────────────────────────────────────────────────────

export async function getTiers() {
  try {
    const tenant = await requireTenant()

    const tiers = await prisma.membershipTier.findMany({
      where: { tenantId: tenant.id },
      include: { _count: { select: { members: true } } },
      orderBy: { priceCents: 'asc' },
    })

    return { success: true, data: tiers }
  } catch (error) {
    console.error('[getTiers]', error)
    return { success: false, error: 'Failed to load tiers', data: [] }
  }
}

export async function createTier(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = TierSchema.parse(input)

    const tier = await prisma.membershipTier.create({
      data: { ...data, tenantId: tenant.id },
    })

    revalidatePath('/dashboard/members')
    return { success: true, data: tier }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('[createTier]', error)
    return { success: false, error: 'Failed to create tier' }
  }
}

export async function updateTier(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = TierSchema.parse(input)

    const tier = await prisma.membershipTier.update({
      where: { id, tenantId: tenant.id },
      data,
    })

    revalidatePath('/dashboard/members')
    return { success: true, data: tier }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('[updateTier]', error)
    return { success: false, error: 'Failed to update tier' }
  }
}

export async function deleteTier(id: string) {
  try {
    const tenant = await requireTenant()

    // Unlink members from this tier first
    await prisma.member.updateMany({
      where: { tenantId: tenant.id, tierId: id },
      data: { tierId: null },
    })

    await prisma.membershipTier.delete({
      where: { id, tenantId: tenant.id },
    })

    revalidatePath('/dashboard/members')
    return { success: true }
  } catch (error) {
    console.error('[deleteTier]', error)
    return { success: false, error: 'Failed to delete tier' }
  }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

export async function getMemberStats() {
  try {
    const tenant = await requireTenant()

    const [total, active, pending, byTier] = await Promise.all([
      prisma.member.count({ where: { tenantId: tenant.id } }),
      prisma.member.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }),
      prisma.member.count({ where: { tenantId: tenant.id, status: 'PENDING' } }),
      prisma.member.groupBy({
        by: ['tierId'],
        where: { tenantId: tenant.id },
        _count: true,
      }),
    ])

    return { success: true, data: { total, active, pending, byTier } }
  } catch (error) {
    console.error('[getMemberStats]', error)
    return { success: false, error: 'Failed to load stats', data: null }
  }
}

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────

/**
 * Export all members for the current tenant as a CSV string.
 * Call from a Server Action triggered by a client button; return the CSV string
 * and let the client create a Blob download.
 */
export async function exportMembersCSV() {
  try {
    const tenant = await requireTenant()

    const members = await prisma.member.findMany({
      where: { tenantId: tenant.id },
      include: { tier: { select: { name: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const rows = members.map((m) => ({
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone ?? '',
      status: m.status,
      tier: m.tier?.name ?? '',
      address: m.address ?? '',
      city: m.city ?? '',
      state: m.state ?? '',
      postalCode: m.postalCode ?? '',
      country: m.country,
      joinedAt: m.joinedAt.toISOString().slice(0, 10),
      renewsAt: m.renewsAt ? m.renewsAt.toISOString().slice(0, 10) : '',
      notes: m.notes ?? '',
    }))

    const csv = Papa.unparse(rows)
    return { success: true, data: csv }
  } catch (error) {
    console.error('[exportMembersCSV]', error)
    return { success: false, error: 'Failed to export members', data: null }
  }
}

// ─── CSV IMPORT ──────────────────────────────────────────────────────────────

const ImportRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'BANNED']).default('ACTIVE'),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  postalCode: z.string().optional().default(''),
  country: z.string().optional().default('US'),
  notes: z.string().optional().default(''),
})

/**
 * Import members from a CSV string.
 * Rows with duplicate emails for this tenant are skipped (not overwritten).
 * Returns { imported, skipped, errors[] }.
 */
export async function importMembersCSV(csvContent: string) {
  try {
    const tenant = await requireTenant()

    const { data, errors: parseErrors } = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    })

    if (parseErrors.length > 0) {
      return { success: false, error: 'CSV parse error', data: null }
    }

    let imported = 0
    let skipped = 0
    const rowErrors: string[] = []

    for (const [idx, rawRow] of (data as Record<string, unknown>[]).entries()) {
      const parsed = ImportRowSchema.safeParse(rawRow)
      if (!parsed.success) {
        rowErrors.push(`Row ${idx + 2}: ${parsed.error.issues.map((i) => i.message).join(', ')}`)
        skipped++
        continue
      }

      const row = parsed.data
      const exists = await prisma.member.findFirst({
        where: { tenantId: tenant.id, email: row.email },
        select: { id: true },
      })

      if (exists) {
        skipped++
        continue
      }

      await prisma.member.create({
        data: {
          tenantId: tenant.id,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone || undefined,
          status: row.status,
          address: row.address || undefined,
          city: row.city || undefined,
          state: row.state || undefined,
          postalCode: row.postalCode || undefined,
          country: row.country || 'US',
          notes: row.notes || undefined,
        },
      })
      imported++
    }

    revalidatePath('/dashboard/members')
    return { success: true, data: { imported, skipped, errors: rowErrors } }
  } catch (error) {
    console.error('[importMembersCSV]', error)
    return { success: false, error: 'Failed to import members', data: null }
  }
}

// ─── SMS RENEWAL REMINDERS ───────────────────────────────────────────────────

/**
 * Send SMS renewal reminders to ACTIVE members whose membership
 * renews within `daysAhead` days (default 30) and who have a phone on file.
 * No-op if Twilio is not configured. Returns counts of sent/skipped.
 */
export async function sendRenewalSmsReminders(daysAhead = 30) {
  try {
    const tenant = await requireTenant()
    const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)

    const members = await prisma.member.findMany({
      where: {
        tenantId: tenant.id,
        status: 'ACTIVE',
        renewsAt: { lte: cutoff, gte: new Date() },
        phone: { not: null },
      },
      select: { phone: true, firstName: true, renewsAt: true },
    })

    let sent = 0
    let skipped = 0
    for (const m of members) {
      if (!m.phone || !m.renewsAt) { skipped++; continue }
      const result = await sendMembershipRenewalReminder({
        phone: m.phone,
        firstName: m.firstName,
        orgName: tenant.name,
      })
      if (result) sent++
      else skipped++
    }

    return { success: true, data: { sent, skipped } }
  } catch (error) {
    console.error('[sendRenewalSmsReminders]', error)
    return { success: false, error: 'Failed to send renewal reminders' }
  }
}

