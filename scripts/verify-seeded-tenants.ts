#!/usr/bin/env tsx
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TENANT_SLUGS = [
  'tenant-non-profit',
  'tenant-business-club',
  'tenant-volunteer-group',
]

async function reportTenant(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) {
    console.log(`Tenant not found: ${slug}`)
    return
  }

  const [members, tiers, events, registrations, volunteerOpportunities, shifts, volunteerSignups, shiftSignups] = await Promise.all([
    prisma.member.count({ where: { tenantId: tenant.id } }),
    prisma.membershipTier.count({ where: { tenantId: tenant.id } }),
    prisma.event.count({ where: { tenantId: tenant.id } }),
    prisma.eventRegistration.count({ where: { event: { tenantId: tenant.id } } }),
    prisma.volunteerOpportunity.count({ where: { tenantId: tenant.id } }),
    prisma.volunteerShift.count({ where: { opportunity: { tenantId: tenant.id } } }),
    prisma.volunteerSignup.count({ where: { opportunity: { tenantId: tenant.id } } }),
    prisma.volunteerShiftSignup.count({ where: { shift: { opportunity: { tenantId: tenant.id } } } }),
  ])

  console.log(`\nTenant: ${tenant.name} (${tenant.slug})`)
  console.log(`  members: ${members}`)
  console.log(`  membership tiers: ${tiers}`)
  console.log(`  events: ${events}`)
  console.log(`  registrations: ${registrations}`)
  console.log(`  volunteer opportunities: ${volunteerOpportunities}`)
  console.log(`  volunteer shifts: ${shifts}`)
  console.log(`  volunteer signups: ${volunteerSignups}`)
  console.log(`  volunteer shift signups: ${shiftSignups}`)
}

async function main() {
  console.log('Verifying seeded tenant data...')

  for (const slug of TENANT_SLUGS) {
    await reportTenant(slug)
  }

  const missingTenants = await prisma.tenant.findMany({
    where: { slug: { in: TENANT_SLUGS } },
    select: { slug: true },
  })

  const foundSlugs = missingTenants.map((tenant) => tenant.slug)
  const notFound = TENANT_SLUGS.filter((slug) => !foundSlugs.includes(slug))
  if (notFound.length > 0) {
    console.log('\nMissing tenants:', notFound.join(', '))
  }
}

main()
  .catch((error) => {
    console.error('Verification failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
