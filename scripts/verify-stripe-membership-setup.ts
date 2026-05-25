/**
 * verify-stripe-membership-setup.ts
 *
 * Diagnostic script: reports Stripe readiness and membership tier state for every tenant.
 * Does NOT modify anything. Read-only.
 *
 * Usage:
 *   npx tsx scripts/verify-stripe-membership-setup.ts
 *
 * To fix "No paid membership tier is configured with a Stripe Price ID":
 *   1. Go to /dashboard/tiers/new and create a paid tier (price > $0).
 *   2. In the tier creation form, paste the Stripe Price ID from your Stripe Dashboard.
 *   3. Once saved, this warning will disappear for that tenant.
 *
 * IMPORTANT: This app uses LIVE Stripe keys. Do NOT create Stripe products
 * programmatically without explicit operator confirmation.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })

  const tiers = await prisma.membershipTier.findMany({
    select: {
      id: true,
      tenantId: true,
      name: true,
      priceCents: true,
      stripePriceId: true,
      isActive: true,
      interval: true,
    },
    orderBy: [{ tenantId: 'asc' }, { priceCents: 'asc' }],
  })

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('  STRIPE MEMBERSHIP SETUP VERIFICATION')
  console.log('══════════════════════════════════════════════════════════════\n')

  // Env var check
  const envChecks = [
    { key: 'STRIPE_SECRET_KEY', set: Boolean(process.env.STRIPE_SECRET_KEY?.trim()) },
    { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', set: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()) },
    { key: 'STRIPE_WEBHOOK_SECRET', set: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()) },
    { key: 'NEXT_PUBLIC_APP_URL', set: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()) },
  ]

  console.log('Environment variables:')
  for (const { key, set } of envChecks) {
    console.log(`  ${set ? '✅' : '❌'} ${key}: ${set ? 'set' : 'MISSING'}`)
  }
  const allEnvSet = envChecks.every((c) => c.set)
  console.log(`  → Env overall: ${allEnvSet ? '✅ All required vars present' : '❌ Missing vars above must be set'}\n`)

  // Per-tenant tier analysis
  console.log('Tenant tier analysis:')
  for (const tenant of tenants) {
    const tenantTiers = tiers.filter((t) => t.tenantId === tenant.id)
    const paidWithPrice = tenantTiers.filter(
      (t) => t.priceCents > 0 && t.stripePriceId !== null && t.isActive,
    )
    const warningFires = paidWithPrice.length === 0

    console.log(`\n  Tenant: ${tenant.name} (slug: ${tenant.slug})`)
    console.log(`  ID: ${tenant.id}`)

    if (tenantTiers.length === 0) {
      console.log('  ❌ No membership tiers at all — warning will fire')
      console.log('  → Fix: Create a tier at /dashboard/tiers/new for this tenant')
    } else {
      console.log(`  Tiers (${tenantTiers.length}):`)
      for (const tier of tenantTiers) {
        const priceStr = tier.priceCents === 0 ? 'FREE' : `$${(tier.priceCents / 100).toFixed(2)}`
        const stripeStatus = tier.stripePriceId ? `✅ ${tier.stripePriceId}` : '❌ no stripePriceId'
        const activeStatus = tier.isActive ? 'active' : 'inactive'
        console.log(
          `    - "${tier.name}" ${priceStr}/${tier.interval.toLowerCase()} [${activeStatus}] stripe: ${stripeStatus}`,
        )
      }

      if (warningFires) {
        console.log('  ❌ Stripe warning WILL fire: no paid active tier has a Stripe Price ID')
        console.log('  → Fix: In the Stripe Dashboard, find the Price ID for this tenant\'s paid plan.')
        console.log('     Then open /dashboard/tiers/{tierId}/edit and set the Strip Price ID field.')
      } else {
        console.log(`  ✅ Stripe warning will NOT fire: ${paidWithPrice.length} paid tier(s) with Price IDs`)
      }
    }
  }

  const allGood = tenants.every((tenant) => {
    const tenantTiers = tiers.filter((t) => t.tenantId === tenant.id)
    const paidWithPrice = tenantTiers.filter(
      (t) => t.priceCents > 0 && t.stripePriceId !== null && t.isActive,
    )
    return paidWithPrice.length > 0
  })

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log(`  OVERALL: ${allGood ? '✅ All tenants have paid tiers with Stripe Price IDs' : '❌ Some tenants will show the Stripe warning'}`)
  console.log('══════════════════════════════════════════════════════════════\n')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
