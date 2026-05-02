import test from 'node:test'
import assert from 'node:assert/strict'
import { buildContactWhere, isHighRiskBulkAction } from './organization-console'

test('buildContactWhere sets tenant and member segment filters', () => {
  const where = buildContactWhere('tenant_123', 'members', 'alex') as Record<string, unknown>

  assert.equal(where.tenantId, 'tenant_123')
  assert.deepEqual(where.memberId, { not: null })
  assert.ok(Array.isArray(where.OR))
})

test('buildContactWhere sets archived segment filter', () => {
  const where = buildContactWhere('tenant_123', 'archived') as Record<string, unknown>
  assert.deepEqual(where.tags, { has: 'archived' })
})

test('isHighRiskBulkAction marks archive and large scope as high risk', () => {
  assert.equal(isHighRiskBulkAction('archive', 1), true)
  assert.equal(isHighRiskBulkAction('restore', 1), true)
  assert.equal(isHighRiskBulkAction('assign_tags', 251), true)
  assert.equal(isHighRiskBulkAction('assign_tags', 10), false)
})
