#!/usr/bin/env tsx
/**
 * Repair script: link existing Prisma tenants to Clerk organizations when possible.
 *
 * Strategy:
 * - Find tenants with a NULL `clerkOrgId`.
 * - Try to locate a Clerk organization by `slug` or `name` and update the tenant record.
 * - Log any tenants that couldn't be matched for manual review.
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_... npx tsx scripts/repair-orphan-tenants.ts --allow-tenant-slugs=slug-a,slug-b
 *   CLERK_SECRET_KEY=sk_... npx tsx scripts/repair-orphan-tenants.ts --allow-tenant-slugs=slug-a --commit
 */

import 'dotenv/config'
import fs from 'fs'
import { createClerkClient } from '@clerk/backend'
import { prisma } from '@/lib/prisma'

function parseTenantAllowlistArg() {
  const allowArg = process.argv.find((a) => a.startsWith('--allow-tenant-slugs='))
  if (!allowArg) return []
  return allowArg
    .split('=')[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    console.error('CLERK_SECRET_KEY is required to run this script')
    process.exit(1)
  }

  const commit = process.argv.includes('--commit')
  const outputArg = process.argv.find((a) => a.startsWith('--output='))
  const outputPath = outputArg ? outputArg.split('=')[1] : null
  const allowTenantSlugs = parseTenantAllowlistArg()

  if (allowTenantSlugs.length === 0) {
    console.error('Missing required --allow-tenant-slugs=slug-a,slug-b guardrail')
    process.exit(1)
  }

  const clerk = createClerkClient({ secretKey })

  // Find tenants with placeholder/empty clerkOrgId (e.g. from simulate script or manual creation)
  const orphanTenants = await prisma.tenant.findMany({
    where: {
      slug: { in: allowTenantSlugs },
      OR: [
        { clerkOrgId: '' },
        { clerkOrgId: { startsWith: 'demo_' } },
        { clerkOrgId: { startsWith: 'placeholder_' } },
      ],
    },
  })
  console.log(`Mode: ${commit ? 'commit' : 'dry-run'}`)
  console.log(`Allowed tenant slugs: ${allowTenantSlugs.join(', ')}`)
  console.log(`Found ${orphanTenants.length} tenants with placeholder clerkOrgId in allowlist`)

  const matches: Array<{ tenantId: string; tenantSlug: string; tenantName: string; orgId: string }> = []

  for (const t of orphanTenants) {
    console.log(`Checking tenant: id=${t.id} slug=${t.slug} name=${t.name}`)
    try {
      // Try lookup by slug first
      let org: any = null
      try {
        org = await clerk.organizations.getOrganization({ slug: t.slug })
      } catch (e) {
        // ignore not found
      }

      if (!org) {
        // Try searching org list by name
        const list = await clerk.organizations.getOrganizationList({ query: t.name, limit: 10 })
        org = list.data.find((o: any) => o.name === t.name) || null
      }

      if (org) {
        console.log(`Matched org ${org.id} for tenant ${t.id}`)
        matches.push({ tenantId: t.id, tenantSlug: t.slug, tenantName: t.name, orgId: org.id })
        if (commit) {
          await prisma.tenant.update({ where: { id: t.id }, data: { clerkOrgId: org.id } })
          console.log(`Updated tenant ${t.id} -> ${org.id}`)
        } else {
          console.log(`Dry-run: would update tenant ${t.id} -> ${org.id} (use --commit to apply)`)
        }
      } else {
        console.warn(`No Clerk org matched for tenant id=${t.id} name=${t.name} slug=${t.slug}`)
      }
    } catch (err) {
      console.error('Error checking tenant', t.id, err)
    }
  }

  if (outputPath) {
    try {
      fs.writeFileSync(outputPath, JSON.stringify({ timestamp: new Date().toISOString(), commit, matches }, null, 2))
      console.log(`Wrote results to ${outputPath}`)
    } catch (err) {
      console.error('Failed to write output file', err)
    }
  }

  console.log('Repair script finished.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
