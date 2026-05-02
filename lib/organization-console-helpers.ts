import Papa from 'papaparse'
import { z } from 'zod'

const Segments = ['all', 'members', 'donors', 'volunteers', 'attendees', 'leads', 'archived'] as const

export type Segment = (typeof Segments)[number]
export const segmentSchema = z.enum(Segments)

const ImportStrategies = ['skip_duplicates', 'update_existing', 'create_new_only', 'merge_by_email'] as const

export type ImportStrategy = (typeof ImportStrategies)[number]
export const importStrategySchema = z.enum(ImportStrategies)

export const SYSTEM_ARCHIVE_TAG = '__system_archived'
export const BULK_SCOPE_WARNING_THRESHOLD = 250
export const BULK_SCOPE_HARD_BLOCK_THRESHOLD = 1500

export type BulkOperation = 'assign_tags' | 'archive' | 'restore'

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
  if (segment === 'archived') where.tags = { has: SYSTEM_ARCHIVE_TAG }

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

export function isHighRiskBulkAction(operation: BulkOperation, affectedCount: number) {
  return operation === 'archive' || operation === 'restore' || affectedCount > BULK_SCOPE_WARNING_THRESHOLD
}

export function requiresTypedConfirmationForBulk(operation: BulkOperation, affectedCount: number) {
  return isHighRiskBulkAction(operation, affectedCount)
}

export function requiresTypedConfirmationForImport(strategy: ImportStrategy, duplicates: number) {
  return (strategy === 'update_existing' || strategy === 'merge_by_email') && duplicates > 0
}

export function isLargeScopeOperation(affectedCount: number) {
  return affectedCount > BULK_SCOPE_WARNING_THRESHOLD
}

export function exceedsBulkHardBlock(affectedCount: number) {
  return affectedCount > BULK_SCOPE_HARD_BLOCK_THRESHOLD
}

export function setArchivedTag(tags: string[], archived: boolean) {
  const next = new Set(tags)
  if (archived) next.add(SYSTEM_ARCHIVE_TAG)
  else next.delete(SYSTEM_ARCHIVE_TAG)
  return Array.from(next)
}

export function isArchivedTagSet(tags: string[]) {
  return tags.includes(SYSTEM_ARCHIVE_TAG)
}

const CsvRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'BANNED']).default('ACTIVE'),
  tierId: z.string().optional().nullable(),
})

type ParsedImport = {
  validRows: Array<z.infer<typeof CsvRowSchema>>
  rowErrors: Array<{ rowNumber: number; message: string }>
  parseErrors: Array<{ rowNumber: number; message: string }>
}

export function parseImportRows(csvContent: string): ParsedImport {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  })

  const parseErrors = parsed.errors.map((error) => ({
    rowNumber: (error.row ?? 0) + 2,
    message: error.message,
  }))

  const rows = parsed.data as Record<string, unknown>[]

  const validRows: Array<z.infer<typeof CsvRowSchema>> = []
  const rowErrors: Array<{ rowNumber: number; message: string }> = []

  rows.forEach((row, index) => {
    const result = CsvRowSchema.safeParse(row)
    if (result.success) {
      validRows.push(result.data)
      return
    }
    rowErrors.push({
      rowNumber: index + 2,
      message: result.error.issues.map((issue) => issue.message).join('; '),
    })
  })

  return { validRows, rowErrors, parseErrors }
}

export function renderImportErrorsCsv(errors: Array<{ rowNumber: number; message: string }>) {
  return Papa.unparse(
    errors.map((error) => ({
      rowNumber: error.rowNumber,
      error: error.message,
    }))
  )
}
