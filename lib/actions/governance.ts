'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

// ─── GOVERNANCE OFFICES ───────────────────────────────────────────────────────

const OfficeSchema = z.object({
  title:       z.string().min(1, 'Title required').max(100),
  description: z.string().optional(),
  sortOrder:   z.coerce.number().int().default(0),
  isActive:    z.boolean().default(true),
})

export async function getGovernanceOffices() {
  try {
    const tenant = await requireTenant()
    const offices = await prisma.governanceOffice.findMany({
      where: { tenantId: tenant.id },
      include: { _count: { select: { terms: true } } },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    })
    return { success: true, data: offices }
  } catch (e) {
    console.error('[getGovernanceOffices]', e)
    return { success: false, error: 'Failed to load offices', data: [] }
  }
}

export async function createGovernanceOffice(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = OfficeSchema.parse(input)
    const office = await prisma.governanceOffice.create({
      data: { ...data, tenantId: tenant.id },
    })
    revalidatePath('/dashboard/governance')
    return { success: true, data: office }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[createGovernanceOffice]', e)
    return { success: false, error: 'Failed to create office' }
  }
}

export async function updateGovernanceOffice(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = OfficeSchema.partial().parse(input)
    const office = await prisma.governanceOffice.update({
      where: { id, tenantId: tenant.id },
      data,
    })
    revalidatePath('/dashboard/governance')
    return { success: true, data: office }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[updateGovernanceOffice]', e)
    return { success: false, error: 'Failed to update office' }
  }
}

// ─── COMMITTEES ───────────────────────────────────────────────────────────────

const CommitteeSchema = z.object({
  name:        z.string().min(1, 'Name required').max(100),
  description: z.string().optional(),
  isActive:    z.boolean().default(true),
})

export async function getCommittees() {
  try {
    const tenant = await requireTenant()
    const committees = await prisma.committee.findMany({
      where: { tenantId: tenant.id },
      include: { _count: { select: { memberships: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: committees }
  } catch (e) {
    console.error('[getCommittees]', e)
    return { success: false, error: 'Failed to load committees', data: [] }
  }
}

export async function createCommittee(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = CommitteeSchema.parse(input)
    const committee = await prisma.committee.create({
      data: { ...data, tenantId: tenant.id },
    })
    revalidatePath('/dashboard/governance')
    return { success: true, data: committee }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[createCommittee]', e)
    return { success: false, error: 'Failed to create committee' }
  }
}

// ─── OFFICER TERMS ────────────────────────────────────────────────────────────

const OfficerTermSchema = z.object({
  officeId:  z.string().min(1, 'Office required'),
  contactId: z.string().min(1, 'Contact required'),
  startDate: z.coerce.date(),
  endDate:   z.coerce.date().optional(),
  notes:     z.string().optional(),
})

export async function getOfficerTerms(opts?: { status?: string }) {
  try {
    const tenant = await requireTenant()
    const terms = await prisma.officerTerm.findMany({
      where: {
        tenantId: tenant.id,
        ...(opts?.status ? { status: opts.status as import('@prisma/client').OfficerTermStatus } : {}),
      },
      include: {
        office:  { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true, emails: true, email: true } },
      },
      orderBy: { startDate: 'desc' },
    })
    return { success: true, data: terms }
  } catch (e) {
    console.error('[getOfficerTerms]', e)
    return { success: false, error: 'Failed to load officer terms', data: [] }
  }
}

export async function createOfficerTerm(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = OfficerTermSchema.parse(input)
    const term = await prisma.officerTerm.create({
      data: { ...data, tenantId: tenant.id },
    })
    revalidatePath('/dashboard/governance')
    return { success: true, data: term }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[createOfficerTerm]', e)
    return { success: false, error: 'Failed to assign officer' }
  }
}

export async function endOfficerTerm(id: string) {
  try {
    const tenant = await requireTenant()
    const term = await prisma.officerTerm.update({
      where: { id, tenantId: tenant.id },
      data: { status: 'COMPLETED', endDate: new Date() },
    })
    revalidatePath('/dashboard/governance')
    return { success: true, data: term }
  } catch (e) {
    console.error('[endOfficerTerm]', e)
    return { success: false, error: 'Failed to end officer term' }
  }
}
