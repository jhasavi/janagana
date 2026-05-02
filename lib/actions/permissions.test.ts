import test from 'node:test'
import assert from 'node:assert/strict'
import { roleCanPerformAction, isAdminOrOwnerRole } from '@/lib/permissions-policy'

test('owner can perform high-risk actions', () => {
  assert.equal(roleCanPerformAction('owner', 'bulk_archive'), true)
  assert.equal(roleCanPerformAction('org:owner', 'import_commit_overwrite'), true)
  assert.equal(roleCanPerformAction('owner', 'duplicates_merge'), true)
})

test('admin can perform safe actions but not owner-only actions', () => {
  assert.equal(roleCanPerformAction('admin', 'bulk_preview'), true)
  assert.equal(roleCanPerformAction('org:admin', 'bulk_assign_tags'), true)
  assert.equal(roleCanPerformAction('admin', 'bulk_archive'), false)
  assert.equal(roleCanPerformAction('admin', 'import_commit_overwrite'), false)
})

test('non-admin roles are denied', () => {
  assert.equal(roleCanPerformAction('member', 'bulk_preview'), false)
  assert.equal(roleCanPerformAction('viewer', 'import_preview'), false)
})

test('isAdminOrOwnerRole normalizes org-prefixed roles', () => {
  assert.equal(isAdminOrOwnerRole('org:admin'), true)
  assert.equal(isAdminOrOwnerRole('org:owner'), true)
  assert.equal(isAdminOrOwnerRole('member'), false)
})
