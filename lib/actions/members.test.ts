import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldBlockDuplicateActiveEnrollment } from '@/lib/members-guards'

test('duplicate active enrollment is blocked only for ACTIVE status', () => {
  assert.equal(shouldBlockDuplicateActiveEnrollment('ACTIVE', true), true)
  assert.equal(shouldBlockDuplicateActiveEnrollment('PENDING', true), false)
  assert.equal(shouldBlockDuplicateActiveEnrollment('INACTIVE', true), false)
  assert.equal(shouldBlockDuplicateActiveEnrollment('BANNED', true), false)
  assert.equal(shouldBlockDuplicateActiveEnrollment('ACTIVE', false), false)
})
