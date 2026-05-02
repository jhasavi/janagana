'use server'

import { randomUUID } from 'crypto'
import { z } from 'zod'
import Papa from 'papaparse'
import { requireTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { requireTenantAdminAccess } from '@/lib/actions/permissions'
import { logAudit } from '@/lib/actions/audit'

const Segments = ['all', 'members', 'donors', 'volunteers', 'attendees', 'leads', 'archived'] as const

type Segment = (typeof Segments)[number]

const BulkPreviewSchema = z.object({
  segment: z.enum(Segments).default('all'),
  search: z.string().optional(),
  operation: z.enum(['assign_tags', 'archive', 'restore']),
  tags: z.array(z.string().min(1)).max(20).default([]),
})

const BulkCommitSchema = BulkPreviewSchema.extend({
  confirmationText: z.string().optional(),
  expectedCount: z.number().int().min(0),
})

const ImportStrategySchema = z.enum(['skip_duplicates', 'update_existing', 'create_new_only', 'merge_by_email'])

const ImportPreviewSchema = z.object({
  csvContent: z.string().min(1),
  strategy: ImportStrategySchema.default('skip_duplicates'),
})

const ImportCommitSchema = ImportPreviewSchema.extend({
  confirmationText: z.string().optional(),
})

const CsvRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'BANNED']).default('ACTIVE'),
  tierId: z.string().optional().nullable(),
})

function toLower(value?: string | null) {
  return (value ?? '').trim().toLowerCase()
}

export function buildContactWhere(tenantId: string, segment: Segment, search?: string) {
  const where: Record<string, unknown> = { tenantId }

  if (segment === 'members') where.memberId = { not: null }
  if (segment === 'donors') where.donations = { some: {} }
  if (segment === 'volunteers') where.volunteerSignups = { some: {} }
  if (segment === 'attendees') where.eventRegistrations = { some: {} }
  if (segment === 'leads') {
    where.deals = { some: {} }
    where.memberId = null
  }
  if (segment === 'archived') where.tags = { has: 'archived' }

  if (search && search.trim() !== '') {
    const q = search.trim()
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { emails: { has: q.toLowerCase() } },
    ]
  }

  return where
}

export function isHighRiskBulkAction(operation: 'assign_tags' | 'archive' | 'restore', affectedCount: number) {
  return operation === 'archive' || operation === 'restore' || affectedCount > 250
}

export async function getOrganizationConsoleChecklist() {
  try {
    const tenant = await requireTenant()

    const [
      totalContacts,
      duplicatePending,
      tierCount,
      integrationCount,
      eventCount,
      auditCount,
      apiKeys,
      campaigns,
    ] = await Promise.all([
      prisma.contact.count({ where: { tenantId: tenant.id } }),
      prisma.duplicateSuggestion.count({ where: { tenantId: tenant.id, status: 'PENDING' } }),
      prisma.membershipTier.count({ where: { tenantId: tenant.id } }),
      prisma.apiKey.count({ where: { tenantId: tenant.id, isActive: true } }),
      prisma.event.count({ where: { tenantId: tenant.id } }),
      prisma.auditLog.count({ where: { tenantId: tenant.id } }),
      prisma.apiKey.count({ where: { tenantId: tenant.id } }),
      prisma.donationCampaign.count({ where: { tenantId: tenant.id } }),
    ])

    const checklist = [
      { key: 'import-contacts', label: 'Import contacts', done: totalContacts > 0 },
      { key: 'review-duplicates', label: 'Review duplicate contacts', done: duplicatePending === 0 },
      { key: 'configure-tiers', label: 'Configure membership tiers', done: tierCount > 0 },
      { key: 'roles-permissions', label: 'Configure roles and permissions', done: true },
      { key: 'branding', label: 'Set organization branding/logo', done: Boolean(tenant.logoUrl) },
      { key: 'communication-preferences', label: 'Set communication preferences', done: true },
      { key: 'connect-integrations', label: 'Connect integrations', done: integrationCount > 0 || apiKeys > 0 },
      { key: 'first-event', label: 'Create first event', done: eventCount > 0 },
      { key: 'historical-import', label: 'Import historical data', done: totalContacts > 10 },
      { key: 'form-settings', label: 'Review form settings', done: true },
      { key: 'test-export', label: 'Test export', done: auditCount > 0 },
      { key: 'backup-policy', label: 'Set backup/restore policy', done: false },
      { key: 'invite-staff', label: 'Invite admins/staff', done: true },
      { key: 'review-audit', label: 'Review audit log', done: auditCount > 0 },
      { key: 'fundraising', label: 'Create fundraising campaign', done: campaigns > 0 },
    ]

    return { success: true, data: checklist }
  } catch (error) {
    console.error('[getOrganizationConsoleChecklist]', error)
    return { success: false, error: 'Failed to load setup checklist', data: [] }
  }
}

export async function previewContactBulkAction(input: unknown) {
  try {
    const access = await requireTenantAdminAccess('previewContactBulkAction')
    if (!access.success) return { success: false, error: access.error }

    const data = BulkPreviewSchema.parse(input)
    const where = buildContactWhere(access.tenant.id, data.segment, data.search)

    const [affectedCount, sample] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          tags: true,
          lifecycleStage: true,
        },
      }),
    ])

    const highRisk = isHighRiskBulkAction(data.operation, affectedCount)

    return {
      success: true,
      data: {
        operation: data.operation,
        affectedCount,
        highRisk,
        requiresTypedConfirmation: highRisk,
        sample,
        tagDelta: data.operation === 'assign_tags' ? data.tags : [],
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[previewContactBulkAction]', error)
    return { success: false, error: 'Failed to preview bulk action' }
  }
}

export async function commitContactBulkAction(input: unknown) {
  try {
    const access = await requireTenantAdminAccess('commitContactBulkAction')
    if (!access.success) return { success: false, error: access.error }

    const data = BulkCommitSchema.parse(input)
    const where = buildContactWhere(access.tenant.id, data.segment, data.search)

    const contacts = await prisma.contact.findMany({
      where,
      select: {
        id: true,
        tags: true,
      },
      take: 2000,
      orderBy: { createdAt: 'desc' },
    })

    const affectedCount = contacts.length
    if (affectedCount !== data.expectedCount) {
      return { success: false, error: 'Scope changed since preview. Run preview again before committing.' }
    }

    const isHighRisk = isHighRiskBulkAction(data.operation, affectedCount)
    if (isHighRisk && data.confirmationText !== 'CONFIRM') {
      return { success: false, error: 'Typed confirmation required. Enter CONFIRM to continue.' }
    }

    if (affectedCount === 0) {
      return { success: true, data: { jobId: null, affectedCount: 0 } }
    }

    const updates = contacts.map((contact) => {
      const currentTags = new Set(contact.tags ?? [])
      if (data.operation === 'assign_tags') {
        data.tags.forEach((tag) => currentTags.add(tag))
      }
      if (data.operation === 'archive') currentTags.add('archived')
      if (data.operation === 'restore') currentTags.delete('archived')

      return prisma.contact.update({
        where: { id: contact.id },
        data: { tags: Array.from(currentTags) },
      })
    })

    await prisma.$transaction(updates)

    const jobId = randomUUID()
    await logAudit({
      tenantId: access.tenant.id,
      action: 'UPDATE',
      resourceType: 'ContactBulkOperation',
      resourceId: jobId,
      resourceName: `${data.operation} (${affectedCount})`,
      metadata: {
        jobId,
        operation: data.operation,
        segment: data.segment,
        affectedCount,
        sampleContactIds: contacts.slice(0, 100).map((contact) => contact.id),
        tags: data.tags,
        tenantId: access.tenant.id,
      },
    })

    return { success: true, data: { jobId, affectedCount } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[commitContactBulkAction]', error)
    return { success: false, error: 'Failed to run bulk action' }
  }
}

export async function getDataCleanupSummary() {
  try {
    const tenant = await requireTenant()

    const [
      duplicates,
      archivedContacts,
      missingEmail,
      missingName,
      orphanedEnrollments,
      invalidEmailCandidates,
    ] = await Promise.all([
      prisma.duplicateSuggestion.count({ where: { tenantId: tenant.id, status: 'PENDING' } }),
      prisma.contact.count({ where: { tenantId: tenant.id, tags: { has: 'archived' } } }),
      prisma.contact.count({ where: { tenantId: tenant.id, OR: [{ email: null }, { email: '' }] } }),
      prisma.contact.count({
        where: {
          tenantId: tenant.id,
          OR: [{ firstName: '' }, { lastName: '' }],
        },
      }),
      Promise.resolve(0),
      prisma.contact.count({
        where: {
          tenantId: tenant.id,
          email: { not: null },
          NOT: { email: { contains: '@' } },
        },
      }),
    ])

    return {
      success: true,
      data: {
        duplicates,
        archivedContacts,
        missingEmail,
        missingName,
        orphanedEnrollments,
        invalidEmailCandidates,
      },
    }
  } catch (error) {
    console.error('[getDataCleanupSummary]', error)
    return {
      success: false,
      error: 'Failed to load data cleanup summary',
      data: {
        duplicates: 0,
        archivedContacts: 0,
        missingEmail: 0,
        missingName: 0,
        orphanedEnrollments: 0,
        invalidEmailCandidates: 0,
      },
    }
  }
}

export async function previewMembersImportCsv(input: unknown) {
  try {
    const access = await requireTenantAdminAccess('previewMembersImportCsv')
    if (!access.success) return { success: false, error: access.error }

    const data = ImportPreviewSchema.parse(input)

    const parsed = Papa.parse(data.csvContent, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors.length > 0) {
      return { success: false, error: parsed.errors[0]?.message ?? 'CSV parse failed' }
    }

    const rows = parsed.data as Record<string, unknown>[]
    const normalized = rows
      .map((row) => CsvRowSchema.safeParse(row))
      .filter((result) => result.success)
      .map((result) => result.data)

    const emails = Array.from(new Set(normalized.map((row) => toLower(row.email)).filter(Boolean)))

    const existingMembers = emails.length
      ? await prisma.member.findMany({
          where: {
            tenantId: access.tenant.id,
            email: { in: emails },
          },
          select: { email: true },
        })
      : []

    const existingSet = new Set(existingMembers.map((member) => toLower(member.email)))

    const duplicates = normalized.filter((row) => existingSet.has(toLower(row.email))).length
    const validRows = normalized.length
    const invalidRows = rows.length - validRows

    return {
      success: true,
      data: {
        strategy: data.strategy,
        totalRows: rows.length,
        validRows,
        invalidRows,
        duplicates,
        willCreate:
          data.strategy === 'create_new_only' || data.strategy === 'skip_duplicates'
            ? validRows - duplicates
            : validRows,
        willUpdate: data.strategy === 'update_existing' ? duplicates : 0,
        sample: normalized.slice(0, 8),
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[previewMembersImportCsv]', error)
    return { success: false, error: 'Failed to preview CSV import' }
  }
}

export async function commitMembersImportCsv(input: unknown) {
  try {
    const access = await requireTenantAdminAccess('commitMembersImportCsv')
    if (!access.success) return { success: false, error: access.error }

    const data = ImportCommitSchema.parse(input)
    const preview = await previewMembersImportCsv({ csvContent: data.csvContent, strategy: data.strategy })

    if (!preview.success) return preview

    const shouldRequireTypedConfirmation = (preview.data?.duplicates ?? 0) > 0 && data.strategy === 'update_existing'
    if (shouldRequireTypedConfirmation && data.confirmationText !== 'CONFIRM') {
      return { success: false, error: 'Typed confirmation required. Enter CONFIRM to update existing members.' }
    }

    const parsed = Papa.parse(data.csvContent, {
      header: true,
      skipEmptyLines: true,
    })

    const rows = (parsed.data as Record<string, unknown>[])
      .map((row) => CsvRowSchema.safeParse(row))
      .filter((result) => result.success)
      .map((result) => result.data)

    let created = 0
    let updated = 0
    let skipped = 0

    for (const row of rows) {
      const email = toLower(row.email)
      const existing = await prisma.member.findFirst({
        where: { tenantId: access.tenant.id, email },
        select: { id: true },
      })

      if (existing && data.strategy === 'create_new_only') {
        skipped++
        continue
      }

      if (existing && data.strategy === 'skip_duplicates') {
        skipped++
        continue
      }

      if (existing && data.strategy === 'merge_by_email') {
        skipped++
        continue
      }

      if (existing && data.strategy === 'update_existing') {
        await prisma.member.update({
          where: { id: existing.id },
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone || null,
            status: row.status,
            tierId: row.tierId || null,
          },
        })
        updated++
        continue
      }

      await prisma.member.create({
        data: {
          tenantId: access.tenant.id,
          firstName: row.firstName,
          lastName: row.lastName,
          email,
          phone: row.phone || null,
          status: row.status,
          tierId: row.tierId || null,
        },
      })
      created++
    }

    const jobId = randomUUID()
    await logAudit({
      tenantId: access.tenant.id,
      action: 'CREATE',
      resourceType: 'ImportJob',
      resourceId: jobId,
      resourceName: `members-import (${created} created, ${updated} updated)`,
      metadata: {
        strategy: data.strategy,
        created,
        updated,
        skipped,
        tenantId: access.tenant.id,
      },
    })

    return { success: true, data: { jobId, created, updated, skipped } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[commitMembersImportCsv]', error)
    return { success: false, error: 'Failed to commit CSV import' }
  }
}
