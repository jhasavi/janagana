'use server'

import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'

export type StripeReadinessWarning = {
  key: 'stripe_secret' | 'stripe_publishable' | 'stripe_webhook' | 'paid_tier_price_id' | 'public_app_url'
  message: string
  severity: 'warning' | 'info'
}

function getStripeMode(key?: string) {
  if (!key) return 'missing'
  if (key.startsWith('sk_test_') || key.startsWith('pk_test_')) return 'test'
  if (key.startsWith('sk_live_') || key.startsWith('pk_live_')) return 'live'
  return 'unknown'
}

export async function getStripeSetupReadiness() {
  const warnings: StripeReadinessWarning[] = []
  const tenant = await getTenant().catch(() => null)

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    warnings.push({ key: 'stripe_secret', severity: 'warning', message: 'Stripe secret key is not configured. Set STRIPE_SECRET_KEY for payment and refund operations.' })
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()) {
    warnings.push({ key: 'stripe_publishable', severity: 'warning', message: 'Stripe publishable key is missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for web checkout.' })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    warnings.push({ key: 'stripe_webhook', severity: 'warning', message: 'Stripe webhook signing secret is not configured. Set STRIPE_WEBHOOK_SECRET to verify incoming Stripe events.' })
  }

  if (!process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    warnings.push({ key: 'public_app_url', severity: 'warning', message: 'Public application URL is not configured. Set NEXT_PUBLIC_APP_URL for links and redirects.' })
  }

  if (!tenant) {
    if (!process.env.STRIPE_SECRET_KEY?.trim() || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || !process.env.STRIPE_WEBHOOK_SECRET?.trim() || !process.env.NEXT_PUBLIC_APP_URL?.trim()) {
      return { success: true, warnings }
    }

    return {
      success: true,
      warnings: [
        ...warnings,
        {
          key: 'paid_tier_price_id',
          severity: 'info',
          message: 'Stripe configuration appears valid, but paid tier readiness could not be validated without an active tenant.',
        },
      ],
    }
  }

  const tiers = await prisma.membershipTier.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, priceCents: true, stripePriceId: true, isActive: true },
  })

  const activePaidTiers = tiers.filter((tier) => tier.isActive && tier.priceCents > 0)
  const activePaidTiersWithStripeId = activePaidTiers.filter((tier) => tier.stripePriceId)

  if (activePaidTiers.length === 0) {
    if (tiers.length === 0) {
      warnings.push({
        key: 'paid_tier_price_id',
        severity: 'info',
        message: 'Create membership tiers before accepting paid memberships.',
      })
    } else if (tiers.every((tier) => tier.priceCents === 0)) {
      warnings.push({
        key: 'paid_tier_price_id',
        severity: 'info',
        message: 'Add a paid tier when you are ready to accept paid memberships.',
      })
    } else {
      warnings.push({
        key: 'paid_tier_price_id',
        severity: 'info',
        message: 'Activate a paid tier before accepting paid memberships.',
      })
    }
    return { success: true, warnings }
  }

  if (activePaidTiersWithStripeId.length === 0) {
    warnings.push({
      key: 'paid_tier_price_id',
      severity: 'warning',
      message: 'Paid membership tier is missing a Stripe Price ID.',
    })
    return { success: true, warnings }
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim()
  const stripeMode = getStripeMode(stripeSecretKey)
  if (!stripeSecretKey || stripeMode === 'missing') {
    return { success: true, warnings }
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-02-24.acacia' })
  const uniqueStripePriceIds = Array.from(new Set(activePaidTiersWithStripeId.map((tier) => tier.stripePriceId!).filter(Boolean)))
  const priceChecks = await Promise.all(
    uniqueStripePriceIds.map(async (priceId) => {
      try {
        const price = await stripe.prices.retrieve(priceId)
        return { priceId, exists: Boolean(price && !price.deleted) }
      } catch {
        return { priceId, exists: false }
      }
    }),
  )

  if (priceChecks.some((check) => !check.exists)) {
    warnings.push({
      key: 'paid_tier_price_id',
      severity: 'warning',
      message: 'Stripe Price ID could not be verified. Check that the configured price exists in Stripe.',
    })
  }

  return { success: true, warnings }
}
