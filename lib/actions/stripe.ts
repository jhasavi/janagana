'use server'

import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'

export type StripeReadinessWarning = {
  key: 'stripe_secret' | 'stripe_publishable' | 'stripe_webhook' | 'paid_tier_price_id' | 'public_app_url'
  message: string
}

export async function getStripeSetupReadiness() {
  const warnings: StripeReadinessWarning[] = []
  const tenant = await getTenant().catch(() => null)

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    warnings.push({ key: 'stripe_secret', message: 'Stripe secret key is not configured. Set STRIPE_SECRET_KEY for payment and refund operations.' })
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()) {
    warnings.push({ key: 'stripe_publishable', message: 'Stripe publishable key is missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for web checkout.' })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    warnings.push({ key: 'stripe_webhook', message: 'Stripe webhook signing secret is not configured. Set STRIPE_WEBHOOK_SECRET to verify incoming Stripe events.' })
  }

  if (!process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    warnings.push({ key: 'public_app_url', message: 'Public application URL is not configured. Set NEXT_PUBLIC_APP_URL for links and redirects.' })
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
          message: 'Stripe configuration appears valid, but paid tier readiness could not be validated without an active tenant.',
        },
      ],
    }
  }

  const paidTiers = await prisma.membershipTier.count({
    where: {
      tenantId: tenant.id,
      priceCents: { gt: 0 },
      stripePriceId: { not: null },
      isActive: true,
    },
  })

  if (paidTiers === 0) {
    warnings.push({ key: 'paid_tier_price_id', message: 'No paid membership tier is configured with a Stripe Price ID. Add one in Membership Tiers.' })
  }

  return { success: true, warnings }
}
