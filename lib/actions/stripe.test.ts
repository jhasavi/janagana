import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getStripeSetupReadiness } from './stripe'

describe('Stripe setup readiness', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns warnings when required Stripe env vars are missing', async () => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.NEXT_PUBLIC_APP_URL

    const result = await getStripeSetupReadiness()
    assert.equal(result.success, true)
    const warningKeys = new Set(result.warnings.map((warning) => warning.key))
    assert.ok(warningKeys.has('stripe_secret'))
    assert.ok(warningKeys.has('stripe_publishable'))
    assert.ok(warningKeys.has('stripe_webhook'))
    assert.ok(warningKeys.has('public_app_url'))
  })
})
