#!/usr/bin/env tsx
/**
 * Switch a Clerk user to be mapped as the admin of a given tenant.
 *
 * In v2, there is no separate User model — admins are Clerk users who own a
 * Clerk Organization. This script associates a Clerk user with a demo tenant by
 * setting their `clerkUserId` on the first ACTIVE member record that matches the
 * tenant's owner email pattern, or creating a placeholder admin member record.
 *
 * Usage:
 *   CLERK_USER_ID=user_xxx TENANT_SLUG=demo-nonprofit npx tsx scripts/switch-tenant.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const clerkUserId = process.env.CLERK_USER_ID
  const tenantSlug = process.env.TENANT_SLUG

  if (!clerkUserId || !tenantSlug) {
    console.error('Usage: CLERK_USER_ID=<id> TENANT_SLUG=<slug> npx tsx scripts/switch-tenant.ts')
    process.exit(1)
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) {
    console.error(`Tenant not found for slug: ${tenantSlug}`)
    process.exit(1)
  }

  // Clear any existing clerkUserId mapping in this tenant to avoid duplicates
  await prisma.member.updateMany({
    where: { tenantId: tenant.id, clerkUserId },
    data: { clerkUserId: null },
  })

  const ownerEmail = `owner+${tenantSlug}@example.com`

  const member = await prisma.member.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: ownerEmail } },
    update: { clerkUserId, status: 'ACTIVE', firstName: `${tenant.name}`, lastName: 'Admin' },
    create: {
      tenantId: tenant.id,
      clerkUserId,
      email: ownerEmail,
      firstName: `${tenant.name}`,
      lastName: 'Admin',
      status: 'ACTIVE',
    },
  })

  console.log('✅ Tenant switch successful.')
  console.log(`   clerkUserId:  ${clerkUserId}`)
  console.log(`   tenant:       ${tenant.name} (${tenant.slug})`)
  console.log(`   member email: ${member.email}`)
  console.log(`   tenant id:    ${tenant.id}`)
}

main()
  .catch((e) => { console.error('Switch failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
