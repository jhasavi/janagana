'use server'

import { randomUUID } from 'crypto'
import { z } from 'zod'
import Papa from 'papaparse'
import { requireTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { requireTenantActionAccess } from '@/lib/actions/permissions'
import { logAudit } from '@/lib/actions/audit'
import {
  segmentSchema,
  importStrategySchema,
  SYSTEM_ARCHIVE_TAG,
  BULK_SCOPE_HARD_BLOCK_THRESHOLD,
  buildContactWhere,
  isHighRiskBulkAction,
  requiresTypedConfirmationForBulk,
  requiresTypedConfirmationForImport,
  isLargeScopeOperation,
  exceedsBulkHardBlock,
  setArchivedTag,
  parseImportRows,
  renderImportErrorsCsv,
  type BulkOperation,
} from '@/lib/organization-console-helpers'

const BulkPreviewSchema = z.object({
  segment: segmentSchema.default('all'),
  search: z.string().optional(),
  operation: z.enum(['assign_tags', 'archive', 'restore']),
  tags: z.array(z.string().min(1)).max(20).default([]),
})

const BulkCommitSchema = BulkPreviewSchema.extend({
  confirmationText: z.string().optional(),
  expectedCount: z.number().int().min(0),
})

const ImportStrategySchema = importStrategySchema

const ImportPreviewSchema = z.object({
  csvContent: z.string().min(1),
  strategy: ImportStrategySchema.default('skip_duplicates'),
})

const ImportCommitSchema = ImportPreviewSchema.extend({
  confirmationText: z.string().optional(),
})

const IMPORT_INVALID_HARD_BLOCK = 250

function toLower(value?: string | null) {
  return (value ?? '').trim().toLowerCase()
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
    const access = await requireTenantActionAccess('previewContactBulkAction', 'bulk_preview')
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
    const largeScopeWarning = isLargeScopeOperation(affectedCount)
    const blockedByScope = exceedsBulkHardBlock(affectedCount)

    return {
      success: true,
      data: {
        operation: data.operation,
        affectedCount,
        highRisk,
        largeScopeWarning,
        blockedByScope,
        requiresTypedConfirmation: highRisk,
        sample,
        tagDelta: data.operation === 'assign_tags' ? data.tags : [],
        warnings: [
          ...(largeScopeWarning
            ? [`Scope is large (${affectedCount} records). Re-check filters before commit.`]
            : []),
          ...(blockedByScope
            ? [`Scope exceeds safety limit (${BULK_SCOPE_HARD_BLOCK_THRESHOLD}). Narrow your filter first.`]
            : []),
        ],
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
    const data = BulkCommitSchema.parse(input)

    const actionForOperation =
      data.operation === 'assign_tags'
        ? 'bulk_assign_tags'
        : data.operation === 'archive'
        ? 'bulk_archive'
        : 'bulk_restore'

    const access = await requireTenantActionAccess('commitContactBulkAction', actionForOperation)
    if (!access.success) return { success: false, error: access.error }

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

    if (exceedsBulkHardBlock(affectedCount)) {
      return {
        success: false,
        error: `Operation blocked: ${affectedCount} records exceed safety threshold of ${BULK_SCOPE_HARD_BLOCK_THRESHOLD}.`,
      }
    }

    const isHighRisk = requiresTypedConfirmationForBulk(data.operation, affectedCount)
    if (isHighRisk && data.confirmationText !== 'CONFIRM') {
      return { success: false, error: 'Typed confirmation required. Enter CONFIRM to continue.' }
    }

    if (affectedCount === 0) {
      return { success: true, data: { jobId: null, affectedCount: 0 } }
    }

    const updates = contacts.map((contact) => {
      const currentTags = contact.tags ?? []
      if (data.operation === 'assign_tags') {
        const merged = new Set(currentTags)
        data.tags.forEach((tag) => merged.add(tag))
        return prisma.contact.update({
          where: { id: contact.id },
          data: { tags: Array.from(merged) },
        })
      }

      const nextTags = setArchivedTag(currentTags, data.operation === 'archive')

      return prisma.contact.update({
        where: { id: contact.id },
        data: { tags: nextTags },
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
        affectedContactIds: contacts.map((contact) => contact.id),
        sampleContactIds: contacts.slice(0, 50).map((contact) => contact.id),
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
      prisma.contact.count({ where: { tenantId: tenant.id, tags: { has: SYSTEM_ARCHIVE_TAG } } }),
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
    const access = await requireTenantActionAccess('previewMembersImportCsv', 'import_preview')
    if (!access.success) return { success: false, error: access.error }

    const data = ImportPreviewSchema.parse(input)

    const parsedRows = parseImportRows(data.csvContent)
    const rows = Papa.parse(data.csvContent, { header: true, skipEmptyLines: true }).data as Record<string, unknown>[]
    const normalized = parsedRows.validRows

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
    const invalidRows = parsedRows.rowErrors.length + parsedRows.parseErrors.length
    const invalidErrorRows = [...parsedRows.parseErrors, ...parsedRows.rowErrors]
    const errorCsv = invalidErrorRows.length > 0 ? renderImportErrorsCsv(invalidErrorRows) : ''

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
        blockedByInvalidRows: invalidRows > IMPORT_INVALID_HARD_BLOCK,
        invalidThreshold: IMPORT_INVALID_HARD_BLOCK,
        errors: invalidErrorRows.slice(0, 200),
        errorCsv,
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
    const data = ImportCommitSchema.parse(input)

    const actionForImport =
      data.strategy === 'update_existing' || data.strategy === 'merge_by_email'
        ? 'import_commit_overwrite'
        : 'import_commit_safe'

    const access = await requireTenantActionAccess('commitMembersImportCsv', actionForImport)
    if (!access.success) return { success: false, error: access.error }

    const preview = await previewMembersImportCsv({ csvContent: data.csvContent, strategy: data.strategy })

    if (!preview.success) return preview

    const requiresTypedConfirmation = requiresTypedConfirmationForImport(
      data.strategy,
      preview.data?.duplicates ?? 0
    )
    if (requiresTypedConfirmation && data.confirmationText !== 'CONFIRM') {
      return { success: false, error: 'Typed confirmation required. Enter CONFIRM to update existing members.' }
    }

    if (preview.data?.blockedByInvalidRows) {
      return {
        success: false,
        error: `Import blocked: invalid rows exceed threshold (${preview.data.invalidThreshold}). Fix errors and retry.`,
      }
    }

    const { validRows: rows } = parseImportRows(data.csvContent)

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
        await prisma.member.update({
          where: { id: existing.id },
          data: {
            firstName: row.firstName || undefined,
            lastName: row.lastName || undefined,
            phone: row.phone || undefined,
            status: row.status,
            tierId: row.tierId || undefined,
          },
        })
        updated++
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
        invalidRows: preview.data?.invalidRows ?? 0,
        duplicateRows: preview.data?.duplicates ?? 0,
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

export async function getRecentBulkOperations(limit = 10) {
  try {
    const access = await requireTenantActionAccess('getRecentBulkOperations', 'bulk_preview')
    if (!access.success) return { success: false, error: access.error, data: [] }

    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: access.tenant.id,
        resourceType: 'ContactBulkOperation',
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(limit, 30)),
      select: {
        id: true,
        resourceId: true,
        resourceName: true,
        createdAt: true,
        metadata: true,
      },
    })

    return { success: true, data: logs }
  } catch (error) {
    console.error('[getRecentBulkOperations]', error)
    return { success: false, error: 'Failed to load recent operations', data: [] }
  }
}

export async function restoreRecentBulkOperation(input: { jobId: string; confirmationText?: string }) {
  try {
    const access = await requireTenantActionAccess('restoreRecentBulkOperation', 'bulk_restore_recent')
    if (!access.success) return { success: false, error: access.error }

    if (input.confirmationText !== 'RESTORE') {
      return { success: false, error: 'Type RESTORE to confirm recovery.' }
    }

    const log = await prisma.auditLog.findFirst({
      where: {
        tenantId: access.tenant.id,
        resourceType: 'ContactBulkOperation',
        resourceId: input.jobId,
      },
      select: {
        resourceId: true,
        metadata: true,
      },
    })

    if (!log || !log.metadata) {
      return { success: false, error: 'Bulk operation not found' }
    }

    const metadata = log.metadata as {
      operation?: BulkOperation
      affectedContactIds?: string[]
    }

    const affectedContactIds = metadata.affectedContactIds ?? []
    if (affectedContactIds.length === 0) {
      return { success: false, error: 'No recoverable records in this operation.' }
    }

    const inverseOperation: BulkOperation | null =
      metadata.operation === 'archive' ? 'restore' : metadata.operation === 'restore' ? 'archive' : null

    if (!inverseOperation) {
      return { success: false, error: 'Only archive/restore operations can be auto-recovered.' }
    }

    const contacts = await prisma.contact.findMany({
      where: { tenantId: access.tenant.id, id: { in: affectedContactIds } },
      select: { id: true, tags: true },
    })

    await prisma.$transaction(
      contacts.map((contact) =>
        prisma.contact.update({
          where: { id: contact.id },
          data: {
            tags: setArchivedTag(contact.tags ?? [], inverseOperation === 'archive'),
          },
        })
      )
    )

    const recoveryJobId = randomUUID()
    await logAudit({
      tenantId: access.tenant.id,
      action: 'UPDATE',
      resourceType: 'ContactBulkOperationRecovery',
      resourceId: recoveryJobId,
      resourceName: `restore ${input.jobId}`,
      metadata: {
        sourceJobId: input.jobId,
        inverseOperation,
        affectedCount: contacts.length,
      },
    })

    return { success: true, data: { recoveryJobId, affectedCount: contacts.length } }
  } catch (error) {
    console.error('[restoreRecentBulkOperation]', error)
    return { success: false, error: 'Failed to restore bulk operation' }
  }
}
