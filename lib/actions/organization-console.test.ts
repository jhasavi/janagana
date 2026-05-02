import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildContactWhere,
  isHighRiskBulkAction,
  requiresTypedConfirmationForBulk,
  requiresTypedConfirmationForImport,
  setArchivedTag,
  isArchivedTagSet,
  parseImportRows,
  renderImportErrorsCsv,
} from '@/lib/organization-console-helpers'

test('buildContactWhere sets tenant and member segment filters', () => {
  const where = buildContactWhere('tenant_123', 'members', 'alex') as Record<string, unknown>

  assert.equal(where.tenantId, 'tenant_123')
  assert.deepEqual(where.memberId, { not: null })
  assert.ok(Array.isArray(where.OR))
})

test('buildContactWhere sets archived segment filter', () => {
  const where = buildContactWhere('tenant_123', 'archived') as Record<string, unknown>
  assert.deepEqual(where.tags, { has: '__system_archived' })
})

test('isHighRiskBulkAction marks archive and large scope as high risk', () => {
  assert.equal(isHighRiskBulkAction('archive', 1), true)
  assert.equal(isHighRiskBulkAction('restore', 1), true)
  assert.equal(isHighRiskBulkAction('assign_tags', 251), true)
  assert.equal(isHighRiskBulkAction('assign_tags', 10), false)
})

test('typed confirmation is required for high-risk bulk operations', () => {
  assert.equal(requiresTypedConfirmationForBulk('archive', 1), true)
  assert.equal(requiresTypedConfirmationForBulk('restore', 25), true)
  assert.equal(requiresTypedConfirmationForBulk('assign_tags', 251), true)
  assert.equal(requiresTypedConfirmationForBulk('assign_tags', 25), false)
})

test('typed confirmation is required for import overwrite and merge strategies with duplicates', () => {
  assert.equal(requiresTypedConfirmationForImport('update_existing', 1), true)
  assert.equal(requiresTypedConfirmationForImport('merge_by_email', 2), true)
  assert.equal(requiresTypedConfirmationForImport('create_new_only', 10), false)
  assert.equal(requiresTypedConfirmationForImport('skip_duplicates', 10), false)
})

test('archive helper sets and unsets system archive marker', () => {
  const archived = setArchivedTag(['vip'], true)
  assert.equal(isArchivedTagSet(archived), true)
  assert.ok(archived.includes('__system_archived'))

  const restored = setArchivedTag(archived, false)
  assert.equal(isArchivedTagSet(restored), false)
  assert.ok(restored.includes('vip'))
})

test('parseImportRows reports row-level validation errors', () => {
  const csv = [
    'firstName,lastName,email,phone,status,tierId',
    'Alex,Valid,alex@example.com,,ACTIVE,',
    'NoEmail,Invalid,,,ACTIVE,',
  ].join('\n')

  const result = parseImportRows(csv)
  assert.equal(result.validRows.length, 1)
  assert.equal(result.rowErrors.length, 1)
  assert.equal(result.rowErrors[0].rowNumber, 3)
})

test('renderImportErrorsCsv serializes row error report', () => {
  const csv = renderImportErrorsCsv([{ rowNumber: 12, message: 'Invalid email' }])
  assert.ok(csv.includes('rowNumber,error'))
  assert.ok(csv.includes('12,Invalid email'))
})
