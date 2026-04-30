'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { requireTenantAdminAccess } from '@/lib/actions/permissions'
import { logAudit } from '@/lib/actions/audit'

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
    const access = await requireTenantAdminAccess('createGovernanceOffice')
    if (!access.success) return access
    const { tenant } = access

    const data = OfficeSchema.parse(input)
    const office = await prisma.governanceOffice.create({
      data: { ...data, tenantId: tenant.id },
    })

    await logAudit({
      tenantId: tenant.id,
      action: 'CREATE',
      resourceType: 'GovernanceOffice',
      resourceId: office.id,
      resourceName: office.title,
      metadata: { sortOrder: office.sortOrder, isActive: office.isActive },
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
    const access = await requireTenantAdminAccess('updateGovernanceOffice')
    if (!access.success) return access
    const { tenant } = access

    const data = OfficeSchema.partial().parse(input)

    const existing = await prisma.governanceOffice.findFirst({
      where: { id, tenantId: tenant.id },
    })
    if (!existing) return { success: false, error: 'Office not found' }

    const office = await prisma.governanceOffice.update({
      where: { id, tenantId: tenant.id },
      data,
    })

    await logAudit({
      tenantId: tenant.id,
      action: 'UPDATE',
      resourceType: 'GovernanceOffice',
      resourceId: office.id,
      resourceName: office.title,
      metadata: { before: { title: existing.title, isActive: existing.isActive }, after: data },
    })

    revalidatePath('/dashboard/governance')
    return { success: true, data: office }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[updateGovernanceOffice]', e)
    return { success: false, error: 'Failed to update office' }
  }
}

export async function deleteGovernanceOffice(id: string) {
  try {
    const access = await requireTenantAdminAccess('deleteGovernanceOffice')
    if (!access.success) return access
    const { tenant } = access

    const existing = await prisma.governanceOffice.findFirst({
      where: { id, tenantId: tenant.id },
      include: { _count: { select: { terms: true } } },
    })
    if (!existing) return { success: false, error: 'Office not found' }
    if (existing._count.terms > 0) {
      return { success: false, error: 'Cannot delete office with active or historical terms' }
    }

    await prisma.governanceOffice.delete({ where: { id, tenantId: tenant.id } })

    await logAudit({
      tenantId: tenant.id,
      action: 'DELETE',
      resourceType: 'GovernanceOffice',
      resourceId: id,
      resourceName: existing.title,
    })

    revalidatePath('/dashboard/governance')
    return { success: true }
  } catch (e) {
    console.error('[deleteGovernanceOffice]', e)
    return { success: false, error: 'Failed to delete office' }
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
    const access = await requireTenantAdminAccess('createCommittee')
    if (!access.success) return access
    const { tenant } = access

    const data = CommitteeSchema.parse(input)
    const committee = await prisma.committee.create({
      data: { ...data, tenantId: tenant.id },
    })

    await logAudit({
      tenantId: tenant.id,
      action: 'CREATE',
      resourceType: 'Committee',
      resourceId: committee.id,
      resourceName: committee.name,
      metadata: { isActive: committee.isActive },
    })

    revalidatePath('/dashboard/governance')
    return { success: true, data: committee }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[createCommittee]', e)
    return { success: false, error: 'Failed to create committee' }
  }
}

export async function updateCommittee(id: string, input: unknown) {
  try {
    const access = await requireTenantAdminAccess('updateCommittee')
    if (!access.success) return access
    const { tenant } = access

    const data = CommitteeSchema.partial().parse(input)

    const existing = await prisma.committee.findFirst({
      where: { id, tenantId: tenant.id },
    })
    if (!existing) return { success: false, error: 'Committee not found' }

    const committee = await prisma.committee.update({
      where: { id, tenantId: tenant.id },
      data,
    })

    await logAudit({
      tenantId: tenant.id,
      action: 'UPDATE',
      resourceType: 'Committee',
      resourceId: committee.id,
      resourceName: committee.name,
      metadata: { before: { name: existing.name, isActive: existing.isActive }, after: data },
    })

    revalidatePath('/dashboard/governance')
    return { success: true, data: committee }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[updateCommittee]', e)
    return { success: false, error: 'Failed to update committee' }
  }
}

export async function deleteCommittee(id: string) {
  try {
    const access = await requireTenantAdminAccess('deleteCommittee')
    if (!access.success) return access
    const { tenant } = access

    const existing = await prisma.committee.findFirst({
      where: { id, tenantId: tenant.id },
      include: { _count: { select: { memberships: true } } },
    })
    if (!existing) return { success: false, error: 'Committee not found' }
    if (existing._count.memberships > 0) {
      return { success: false, error: 'Cannot delete committee with memberships' }
    }

    await prisma.committee.delete({ where: { id, tenantId: tenant.id } })

    await logAudit({
      tenantId: tenant.id,
      action: 'DELETE',
      resourceType: 'Committee',
      resourceId: id,
      resourceName: existing.name,
    })

    revalidatePath('/dashboard/governance')
    return { success: true }
  } catch (e) {
    console.error('[deleteCommittee]', e)
    return { success: false, error: 'Failed to delete committee' }
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
    const access = await requireTenantAdminAccess('createOfficerTerm')
    if (!access.success) return access
    const { tenant } = access

    const data = OfficerTermSchema.parse(input)

    const [office, contact] = await Promise.all([
      prisma.governanceOffice.findFirst({ where: { id: data.officeId, tenantId: tenant.id } }),
      prisma.contact.findFirst({ where: { id: data.contactId, tenantId: tenant.id } }),
    ])
    if (!office) return { success: false, error: 'Office not found' }
    if (!contact) return { success: false, error: 'Contact not found' }

    const term = await prisma.officerTerm.create({
      data: { ...data, tenantId: tenant.id },
    })

    await logAudit({
      tenantId: tenant.id,
      action: 'CREATE',
      resourceType: 'OfficerTerm',
      resourceId: term.id,
      resourceName: office.title,
      metadata: { contactId: term.contactId, officeId: term.officeId, startDate: term.startDate.toISOString() },
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
    const access = await requireTenantAdminAccess('endOfficerTerm')
    if (!access.success) return access
    const { tenant } = access

    const existing = await prisma.officerTerm.findFirst({
      where: { id, tenantId: tenant.id },
      include: { office: { select: { title: true } } },
    })
    if (!existing) return { success: false, error: 'Officer term not found' }
    if (existing.status !== 'ACTIVE') {
      return { success: false, error: 'Only active officer terms can be ended' }
    }

    const term = await prisma.officerTerm.update({
      where: { id, tenantId: tenant.id },
      data: { status: 'COMPLETED', endDate: new Date() },
    })

    await logAudit({
      tenantId: tenant.id,
      action: 'UPDATE',
      resourceType: 'OfficerTerm',
      resourceId: term.id,
      resourceName: existing.office.title,
      metadata: { statusFrom: existing.status, statusTo: 'COMPLETED' },
    })

    revalidatePath('/dashboard/governance')
    return { success: true, data: term }
  } catch (e) {
    console.error('[endOfficerTerm]', e)
    return { success: false, error: 'Failed to end officer term' }
  }
}

export async function deleteOfficerTerm(id: string) {
  try {
    const access = await requireTenantAdminAccess('deleteOfficerTerm')
    if (!access.success) return access
    const { tenant } = access

    const existing = await prisma.officerTerm.findFirst({
      where: { id, tenantId: tenant.id },
      include: { office: { select: { title: true } } },
    })
    if (!existing) return { success: false, error: 'Officer term not found' }

    await prisma.officerTerm.delete({ where: { id, tenantId: tenant.id } })

    await logAudit({
      tenantId: tenant.id,
      action: 'DELETE',
      resourceType: 'OfficerTerm',
      resourceId: id,
      resourceName: existing.office.title,
      metadata: { contactId: existing.contactId, officeId: existing.officeId },
    })

    revalidatePath('/dashboard/governance')
    return { success: true }
  } catch (e) {
    console.error('[deleteOfficerTerm]', e)
    return { success: false, error: 'Failed to delete officer term' }
  }
}
