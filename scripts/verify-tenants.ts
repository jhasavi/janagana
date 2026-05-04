#!/usr/bin/env tsx
/**
 * Verify seeded tenant data in the v2 schema.
 * Usage: npx tsx scripts/verify-tenants.ts
 *        TENANT_SLUG=needham-youth npx tsx scripts/verify-tenants.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function reportTenant(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) {
    console.log(`⚠️  Tenant not found: ${slug}`)
    return
  }

  const [members, tiers, events, registrations, opportunities, shifts, clubs, campaigns, donations, emailCampaigns, apiKeys, webhooks] = await Promise.all([
    prisma.member.count({ where: { tenantId: tenant.id } }),
    prisma.membershipTier.count({ where: { tenantId: tenant.id } }),
    prisma.event.count({ where: { tenantId: tenant.id } }),
    prisma.eventRegistration.count({ where: { memberId: { in: (await prisma.member.findMany({ where: { tenantId: tenant.id }, select: { id: true } })).map(m => m.id) } } }),
    prisma.volunteerOpportunity.count({ where: { tenantId: tenant.id } }),
    prisma.volunteerShift.count({ where: { opportunity: { tenantId: tenant.id } } }),
    prisma.club.count({ where: { tenantId: tenant.id } }),
    prisma.donationCampaign.count({ where: { tenantId: tenant.id } }),
    prisma.donation.count({ where: { tenantId: tenant.id } }),
    prisma.emailCampaign.count({ where: { tenantId: tenant.id } }),
    prisma.apiKey.count({ where: { tenantId: tenant.id } }),
    prisma.webhookEndpoint.count({ where: { tenantId: tenant.id } }),
  ])

  console.log(`\n✅ Tenant: ${tenant.name} (${tenant.slug}) [${tenant.id}]`)
  console.log(`   clerkOrgId:         ${tenant.clerkOrgId ?? '⚠️  NULL — orphan tenant'}`)
  console.log(`   plan:               ${tenant.planSlug}`)
  console.log(`   active:             ${tenant.isActive}`)
  console.log(`   members:            ${members}`)
  console.log(`   membership tiers:   ${tiers}`)
  console.log(`   events:             ${events}`)
  console.log(`   registrations:      ${registrations}`)
  console.log(`   volunteer opps:     ${opportunities}`)
  console.log(`   volunteer shifts:   ${shifts}`)
  console.log(`   clubs:              ${clubs}`)
  console.log(`   donation campaigns: ${campaigns}`)
  console.log(`   donations:          ${donations}`)
  console.log(`   email campaigns:    ${emailCampaigns}`)
  console.log(`   api keys:           ${apiKeys}`)
  console.log(`   webhook endpoints:  ${webhooks}`)
}

async function main() {
  const specificSlug = process.env.TENANT_SLUG
  const allowArg = process.argv.find((value) => value.startsWith('--allow-tenant-slugs='))
  const allowTenantSlugs = allowArg
    ? allowArg
        .split('=')[1]
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : []

  console.log(`Mode: verify`)
  if (allowTenantSlugs.length > 0) {
    console.log(`Allowed tenant slugs: ${allowTenantSlugs.join(', ')}`)
  }

  if (specificSlug) {
    if (allowTenantSlugs.length > 0 && !allowTenantSlugs.includes(specificSlug)) {
      console.error(`TENANT_SLUG ${specificSlug} is not in allowlist`)
      process.exit(1)
    }
    await reportTenant(specificSlug)
  } else {
    const allTenants = await prisma.tenant.findMany({
      where: allowTenantSlugs.length > 0 ? { slug: { in: allowTenantSlugs } } : undefined,
      select: { slug: true },
      orderBy: { createdAt: 'asc' },
    })
    console.log(`\nVerifying all ${allTenants.length} tenants...\n`)
    for (const t of allTenants) {
      await reportTenant(t.slug)
    }
  }

  // Highlight orphan tenants
  const orphans = await prisma.tenant.findMany({
    where: {
      ...(allowTenantSlugs.length > 0 ? { slug: { in: allowTenantSlugs } } : {}),
      OR: [
        { clerkOrgId: '' },
        { clerkOrgId: { startsWith: 'demo_' } },
        { clerkOrgId: { startsWith: 'placeholder_' } },
      ],
    },
    select: { id: true, slug: true, name: true },
  })
  if (orphans.length > 0) {
    console.log(`\n⚠️  ${orphans.length} tenants with placeholder clerkOrgId:`)
    for (const t of orphans) {
      console.log(`   id=${t.id}  slug=${t.slug}  name=${t.name}`)
    }
    console.log('\nRun the repair script to fix placeholders:')
    console.log('  CLERK_SECRET_KEY=sk_... npx tsx scripts/repair-orphan-tenants.ts --output=repair-results.json')
  } else {
    console.log('\n✅ No orphan/placeholder tenants.')
  }

  console.log('\nDone.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
