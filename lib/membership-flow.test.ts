import test from 'node:test'
import assert from 'node:assert/strict'
import { applyContactToMembershipDraft } from './membership-flow'

test('contact-first draft merge fills blanks without overwriting existing values', () => {
  const merged = applyContactToMembershipDraft(
    {
      firstName: '',
      lastName: 'Preset',
      phone: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    {
      firstName: 'Alex',
      lastName: 'Contact',
      phone: '5551112222',
      address: '123 Main',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'US',
    }
  )

  assert.equal(merged.firstName, 'Alex')
  assert.equal(merged.lastName, 'Preset')
  assert.equal(merged.phone, '5551112222')
  assert.equal(merged.city, 'Seattle')
  assert.equal(merged.country, 'US')
})
