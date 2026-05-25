/**
 * verify-stripe-membership-setup.ts
 *
 * Safe Stripe membership setup workflow for tenant-specific verification, planning and application.
 *
 * Usage examples:
 *   npx tsx scripts/verify-stripe-membership-setup.ts --tenant-slug namaste-boston --mode report --stripe-mode live
 *   npx tsx scripts/verify-stripe-membership-setup.ts --tenant-slug namaste-boston --mode plan --stripe-mode live --tier-name "Monthly Membership" --amount-cents 1999 --interval month
 *   npx tsx scripts/verify-stripe-membership-setup.ts --tenant-slug namaste-boston --mode apply --stripe-mode live --confirm --confirm-live --tier-name "Monthly Membership" --amount-cents 1999 --interval month --stripe-price-id price_...
 *
 * Modes:
 *   report  - inspect current tenant tiers and Stripe readiness without mutating anything
 *   plan    - describe exactly what would be linked or created without mutating anything
 *   apply   - perform the DB update and optionally create a Stripe product/price with explicit confirmation
 *
 * Important safety rules:
 *   - Live mode requires --confirm-live to allow Stripe product/price creation
 *   - Live mode will not create Stripe prices without explicit confirmation
 *   - No duplicate DB tiers are created for the same tenant + tier name
 *   - Stripe products/prices are reused when metadata or exact values already exist
 *   - Secret values are never printed
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'

const prisma = new PrismaClient()

type Mode = 'report' | 'plan' | 'apply'
type StripeMode = 'test' | 'live'
type BillingInterval = 'month' | 'year'

interface ParsedArgs {
  tenantSlug?: string
  mode?: Mode
  stripeMode?: StripeMode
  tierName?: string
  amountCents?: number
  interval?: BillingInterval
  stripePriceId?: string
  confirm: boolean
  confirmLive: boolean
}

function loadDotEnv() {
  if (process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return
  }

  const envPath = path.resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return

  const content = readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const [key, ...rest] = line.split('=')
    if (!key || rest.length === 0) continue
    let value = rest.join('=').trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { confirm: false, confirmLive: false }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = argv[i + 1]

    switch (key) {
      case 'tenant-slug':
        args.tenantSlug = next
        i += 1
        break
      case 'mode':
        args.mode = next as Mode
        i += 1
        break
      case 'stripe-mode':
        args.stripeMode = next as StripeMode
        i += 1
        break
      case 'tier-name':
        args.tierName = next
        i += 1
        break
      case 'amount-cents':
        args.amountCents = Number(next)
        i += 1
        break
      case 'interval':
        args.interval = next as BillingInterval
        i += 1
        break
      case 'stripe-price-id':
        args.stripePriceId = next
        i += 1
        break
      case 'confirm':
        args.confirm = true
        break
      case 'confirm-live':
        args.confirmLive = true
        break
      case 'help':
        printUsage()
        process.exit(0)
      default:
        throw new Error(`Unknown flag: --${key}`)
    }
  }
  return args
}

function printUsage() {
  console.log(`
Usage:
  npx tsx scripts/verify-stripe-membership-setup.ts --tenant-slug <slug> --mode report --stripe-mode <test|live>
  npx tsx scripts/verify-stripe-membership-setup.ts --tenant-slug <slug> --mode plan --stripe-mode <test|live> --tier-name <name> --amount-cents <cents> --interval <month|year>
  npx tsx scripts/verify-stripe-membership-setup.ts --tenant-slug <slug> --mode apply --stripe-mode <test|live> --confirm --tier-name <name> --amount-cents <cents> --interval <month|year> [--stripe-price-id <price_id>] [--confirm-live]

Flags:
  --tenant-slug     Tenant slug to inspect or update
  --mode            report | plan | apply
  --stripe-mode     test | live
  --tier-name       Membership tier name for plan/apply
  --amount-cents    Price amount in cents for plan/apply
  --interval        month | year
  --stripe-price-id Stripe Price ID to link instead of creating a new price
  --confirm         Required for apply mode
  --confirm-live    Required for apply mode in live Stripe mode
  --help            Show this usage information
`)
}

function getStripeMode(key?: string) {
  if (!key) return 'missing'
  if (key.startsWith('sk_test_') || key.startsWith('pk_test_')) return 'test'
  if (key.startsWith('sk_live_') || key.startsWith('pk_live_')) return 'live'
  return 'unknown'
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

async function findStripeProduct(stripe: Stripe, tenantSlug: string, tierName: string) {
  const products = await stripe.products.list({ limit: 100 })
  return products.data.find((product) => {
    if (!product.active) return false
    if (product.metadata?.app === 'janagana' && product.metadata?.tenantSlug === tenantSlug && product.metadata?.tierName === tierName) {
      return true
    }
    return product.name === tierName
  })
}

async function findStripePrice(stripe: Stripe, productId: string, amountCents: number, interval: BillingInterval) {
  const prices = await stripe.prices.list({ product: productId, limit: 100 })
  return prices.data.find((price) => {
    if (!price.active) return false
    if (price.currency !== 'usd') return false
    if (price.unit_amount !== amountCents) return false
    if (!price.recurring) return false
    const intervalMatch = interval === 'month' ? price.recurring.interval === 'month' : price.recurring.interval === 'year'
    return intervalMatch
  })
}

async function retrieveStripePrice(stripe: Stripe, priceId: string) {
  return stripe.prices.retrieve(priceId)
}

async function createStripeProduct(stripe: Stripe, tenantSlug: string, tierName: string) {
  return stripe.products.create({
    name: tierName,
    description: `Stripe membership product for ${tenantSlug}`,
    active: true,
    metadata: { app: 'janagana', tenantSlug, tierName },
    type: 'service',
  })
}

async function createStripePrice(stripe: Stripe, productId: string, amountCents: number, interval: BillingInterval, tierName: string, tenantSlug: string) {
  return stripe.prices.create({
    product: productId,
    unit_amount: amountCents,
    currency: 'usd',
    recurring: { interval: interval === 'month' ? 'month' : 'year' },
    nickname: tierName,
    metadata: { app: 'janagana', tenantSlug, tierName },
  })
}

async function resolveStripeContext(stripe: Stripe | null, stripePriceId?: string) {
  if (!stripe || !stripePriceId) return { exists: false, price: null, product: null }
  try {
    const price = await retrieveStripePrice(stripe, stripePriceId)
    const product = typeof price.product === 'string' ? await stripe.products.retrieve(price.product) : price.product
    return { exists: !price.deleted, price, product }
  } catch {
    return { exists: false, price: null, product: null }
  }
}

async function reportTenant(tenantSlug: string, stripeMode: StripeMode) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true, slug: true },
  })
  assert(tenant !== null, `Tenant not found for slug: ${tenantSlug}`)

  const tiers = await prisma.membershipTier.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: 'asc' },
  })

  const envStripeMode = getStripeMode(process.env.STRIPE_SECRET_KEY)
  assert(envStripeMode === stripeMode, `Requested stripe-mode ${stripeMode} does not match environment STRIPE_SECRET_KEY mode ${envStripeMode}`)

  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' }) : null

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log(`Tenant report for ${tenant.name} (slug: ${tenant.slug})`)
  console.log('══════════════════════════════════════════════════════════════')
  console.log(`Tenant ID: ${tenant.id}`)
  console.log(`Requested stripe-mode: ${stripeMode}`)
  console.log(`Environment stripe mode: ${envStripeMode}`)
  console.log(`Stripe key present: ${process.env.STRIPE_SECRET_KEY ? 'yes' : 'no'}`)
  console.log(`Stripe publishable key present: ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'yes' : 'no'}\n`)

  if (tiers.length === 0) {
    console.log('Tenant has no membership tiers.')
    console.log('Warning: Stripe dashboard warning is expected because no paid tier exists.')
    return
  }

  let warningExpected = true
  console.log(`Membership tiers (${tiers.length}):`)
  for (const tier of tiers) {
    const priceLabel = tier.priceCents === 0 ? 'FREE' : formatCurrency(tier.priceCents)
    const activeLabel = tier.isActive ? 'active' : 'inactive'
    console.log(`  - ${tier.name} | ${priceLabel}/${tier.interval.toLowerCase()} | ${activeLabel} | stripePriceId: ${tier.stripePriceId ?? 'none'}`)

    if (tier.priceCents > 0 && tier.isActive && tier.stripePriceId && stripe) {
      const { exists, price, product } = await resolveStripeContext(stripe, tier.stripePriceId)
      const productName = product && 'name' in product ? product.name : 'unknown'
      console.log(`      Stripe price lookup: ${exists ? 'FOUND' : 'MISSING'}${price ? ` | product=${product?.id ?? 'unknown'} name=${productName}` : ''}`)
      if (exists) {
        warningExpected = false
      }
    }
  }

  if (warningExpected) {
    console.log('\n❌ Stripe warning should show: no paid active tier has a valid Stripe Price ID.')
  } else {
    console.log('\n✅ Stripe warning should NOT show: there is at least one paid active tier with a valid Stripe Price ID.')
  }
}

async function planTenant(args: ParsedArgs) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: args.tenantSlug! }, select: { id: true, name: true, slug: true } })
  assert(tenant !== null, `Tenant not found for slug: ${args.tenantSlug}`)
  assert(args.tierName !== undefined && args.tierName !== null, '--tier-name is required for plan mode')
  assert(args.amountCents !== undefined, '--amount-cents is required for plan mode')
  assert(args.interval !== undefined && args.interval !== null, '--interval is required for plan mode')

  const envStripeMode = getStripeMode(process.env.STRIPE_SECRET_KEY)
  assert(envStripeMode === args.stripeMode, `Requested stripe-mode ${args.stripeMode} does not match environment STRIPE_SECRET_KEY mode ${envStripeMode}`)
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' }) : null
  assert(stripe !== null, 'Stripe secret key is required in the environment to run plan mode.')

  const existingTier = await prisma.membershipTier.findFirst({ where: { tenantId: tenant.id, name: args.tierName } })
  console.log('\n══════════════════════════════════════════════════════════════')
  console.log(`Stripe plan for ${tenant.name} (slug: ${tenant.slug})`)
  console.log('══════════════════════════════════════════════════════════════')
  console.log(`Existing tier by name: ${existingTier ? 'yes' : 'no'}`)
  if (existingTier) {
    console.log(`  tier id: ${existingTier.id}`)
    console.log(`  current price: ${formatCurrency(existingTier.priceCents)} / ${existingTier.interval.toLowerCase()}`)
    console.log(`  current stripePriceId: ${existingTier.stripePriceId ?? 'none'}`)
  }

  if (args.stripePriceId) {
    console.log(`Validating provided Stripe price ID: ${args.stripePriceId}`)
    const { exists, price, product } = await resolveStripeContext(stripe, args.stripePriceId)
    assert(exists, `Stripe Price ID ${args.stripePriceId} does not exist or is not accessible.`)
    const productName = product && 'name' in product ? product.name : 'unknown'
    console.log(`  Stripe price exists: yes`)
    console.log(`  product: ${product?.id ?? 'unknown'} name=${productName}`)
    console.log(`  amount: ${price?.unit_amount ?? 'unknown'} ${price?.currency ?? ''}`)
    console.log(`  interval: ${price?.recurring?.interval ?? 'one-time'}`)
  } else {
    const existingProduct = await findStripeProduct(stripe, tenant.slug, args.tierName)
    if (existingProduct) {
      console.log(`Found existing Stripe product: ${existingProduct.id} name=${existingProduct.name}`)
      const existingPrice = await findStripePrice(stripe, existingProduct.id, args.amountCents, args.interval)
      if (existingPrice) {
        console.log(`Found existing Stripe price: ${existingPrice.id} amount=${existingPrice.unit_amount} interval=${existingPrice.recurring?.interval}`)
      } else {
        console.log('No existing matching Stripe price found; a new price would be created for this product.')
      }
    } else {
      console.log('No existing Stripe product found with matching app metadata and tier name.')
      console.log('A new Stripe product and price would be created if apply mode is executed with confirmation.')
    }
  }

  console.log('\nPlanned DB action:')
  if (existingTier) {
    console.log(`  Link or update existing tier '${args.tierName}' for tenant ${tenant.slug}`)
  } else {
    console.log(`  Create new DB tier '${args.tierName}' for tenant ${tenant.slug}`)
  }
  console.log(`  Set price to ${formatCurrency(args.amountCents)} / ${args.interval}`)
  console.log('  Set stripePriceId to provided value or a created/reused Stripe price')
}

async function applyTenant(args: ParsedArgs) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: args.tenantSlug! }, select: { id: true, name: true, slug: true } })
  assert(tenant !== null, `Tenant not found for slug: ${args.tenantSlug}`)
  assert(args.confirm === true, '--confirm is required for apply mode')
  assert(args.tierName !== undefined && args.tierName !== null, '--tier-name is required for apply mode')
  assert(args.amountCents !== undefined, '--amount-cents is required for apply mode')
  assert(args.interval !== undefined && args.interval !== null, '--interval is required for apply mode')
  assert(args.stripeMode !== undefined && args.stripeMode !== null, '--stripe-mode is required for apply mode')
  if (args.stripeMode === 'live') {
    assert(args.confirmLive, '--confirm-live is required for apply mode in live Stripe mode')
  }

  const envStripeMode = getStripeMode(process.env.STRIPE_SECRET_KEY)
  assert(envStripeMode === args.stripeMode, `Requested stripe-mode ${args.stripeMode} does not match environment STRIPE_SECRET_KEY mode ${envStripeMode}`)
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' }) : null
  assert(stripe !== null, 'Stripe secret key is required to run apply mode.')

  let linkedStripePriceId = args.stripePriceId
  if (linkedStripePriceId) {
    console.log(`Validating provided Stripe price ID: ${linkedStripePriceId}`)
    const { exists } = await resolveStripeContext(stripe, linkedStripePriceId)
    assert(exists, `Stripe Price ID ${linkedStripePriceId} does not exist or is not accessible.`)
    console.log(`Using provided Stripe price: ${linkedStripePriceId}`)
  } else {
    const existingProduct = await findStripeProduct(stripe, tenant.slug, args.tierName)
    let product = existingProduct
    if (!product) {
      console.log('No existing Stripe product found; creating a new Stripe product.')
      product = await createStripeProduct(stripe, tenant.slug, args.tierName)
      console.log(`Created Stripe product: ${product.id}`)
    } else {
      console.log(`Reusing Stripe product: ${product.id}`)
    }

    const existingPrice = await findStripePrice(stripe, product.id, args.amountCents, args.interval)
    if (existingPrice) {
      console.log(`Reusing existing Stripe price: ${existingPrice.id}`)
      linkedStripePriceId = existingPrice.id
    } else {
      console.log('Creating a new Stripe price for the product.')
      const created = await createStripePrice(stripe, product.id, args.amountCents, args.interval, args.tierName, tenant.slug)
      linkedStripePriceId = created.id
      console.log(`Created Stripe price: ${created.id}`)
    }
  }

  const existingTier = await prisma.membershipTier.findFirst({ where: { tenantId: tenant.id, name: args.tierName } })
  if (existingTier) {
    console.log(`Updating existing tier ${existingTier.id}`)
    await prisma.membershipTier.update({
      where: { id: existingTier.id },
      data: {
        priceCents: args.amountCents,
        interval: args.interval === 'month' ? 'MONTHLY' : 'ANNUAL',
        stripePriceId: linkedStripePriceId,
      },
    })
  } else {
    console.log('Creating a new DB membership tier')
    await prisma.membershipTier.create({
      data: {
        id: `${tenant.id}-${args.tierName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        tenantId: tenant.id,
        name: args.tierName,
        description: `Stripe membership tier for ${tenant.name}`,
        priceCents: args.amountCents,
        interval: args.interval === 'month' ? 'MONTHLY' : 'ANNUAL',
        isActive: true,
        stripePriceId: linkedStripePriceId,
      },
    })
  }

  console.log('\nApply complete: database tier created or updated successfully.')
  console.log(`Linked Stripe price ID: ${linkedStripePriceId}`)
}

async function main() {
  loadDotEnv()
  const args = parseArgs(process.argv.slice(2))

  if (!args.tenantSlug || !args.mode || !args.stripeMode) {
    printUsage()
    process.exit(1)
  }

  if (!['report', 'plan', 'apply'].includes(args.mode)) {
    throw new Error('--mode must be report, plan, or apply')
  }

  if (!['test', 'live'].includes(args.stripeMode)) {
    throw new Error('--stripe-mode must be test or live')
  }

  if (args.mode === 'report') {
    await reportTenant(args.tenantSlug, args.stripeMode)
  } else if (args.mode === 'plan') {
    await planTenant(args)
  } else if (args.mode === 'apply') {
    await applyTenant(args)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('ERROR:', e instanceof Error ? e.message : e)
  process.exit(1)
})

