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

  it('returns an informational paid tier message when tenant is inactive or absent', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

    const result = await getStripeSetupReadiness()
    assert.equal(result.success, true)
    const paidTierWarning = result.warnings.find((warning) => warning.key === 'paid_tier_price_id')
    assert.ok(paidTierWarning)
    assert.equal(paidTierWarning?.severity, 'info')
    assert.match(paidTierWarning?.message ?? '', /Stripe configuration appears valid, but paid tier readiness could not be validated without an active tenant\.|Create membership tiers before accepting paid memberships\.|Add a paid tier when you are ready to accept paid memberships\./)
  })
})
