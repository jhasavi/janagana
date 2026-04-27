#!/usr/bin/env tsx
/**
 * Simulate multi-tenant demo data for QA and staging environments.
 *
 * Creates three tenant archetypes:
 *   1. Community Non-Profit       (slug: demo-nonprofit)
 *   2. Business Professionals Club (slug: demo-bizclub)
 *   3. Youth Volunteer Group      (slug: demo-volunteers)
 *
 * Safe to run multiple times — uses upsert.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/simulate-demo-data.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function upsertTenant(data: { slug: string; name: string; primaryColor: string; planSlug?: string }) {
  return prisma.tenant.upsert({
    where: { slug: data.slug },
    update: { name: data.name, primaryColor: data.primaryColor, isActive: true },
    create: {
      slug: data.slug,
      name: data.name,
      primaryColor: data.primaryColor,
      isActive: true,
      clerkOrgId: `demo_${data.slug}`,  // placeholder — repair script will fix in staging
      planSlug: data.planSlug ?? 'free',
    },
  })
}

async function createNonProfit() {
  const tenant = await upsertTenant({ slug: 'demo-nonprofit', name: 'Community Non-Profit', primaryColor: '#1E7F5C', planSlug: 'starter' })
  console.log(`  Tenant: ${tenant.name}`)

  // Tiers
  const freeTier = await prisma.membershipTier.upsert({
    where: { id: `demo-nonprofit-free` },
    update: { name: 'Community Member', priceCents: 0 },
    create: { id: `demo-nonprofit-free`, tenantId: tenant.id, name: 'Community Member', priceCents: 0, interval: 'ANNUAL' },
  })
  const supporterTier = await prisma.membershipTier.upsert({
    where: { id: `demo-nonprofit-supporter` },
    update: { name: 'Supporter', priceCents: 5000 },
    create: { id: `demo-nonprofit-supporter`, tenantId: tenant.id, name: 'Supporter', priceCents: 5000, interval: 'ANNUAL', color: '#10B981', benefits: ['Newsletter', 'Event discounts'] },
  })

  // Members
  const memberSeeds = [
    { id: 'demo-np-m1', email: 'alice@demo-nonprofit.example.com', firstName: 'Alice', lastName: 'Johnson', status: 'ACTIVE' as const, tierId: supporterTier.id },
    { id: 'demo-np-m2', email: 'bob@demo-nonprofit.example.com', firstName: 'Bob', lastName: 'Williams', status: 'ACTIVE' as const, tierId: freeTier.id },
    { id: 'demo-np-m3', email: 'carol@demo-nonprofit.example.com', firstName: 'Carol', lastName: 'Smith', status: 'PENDING' as const, tierId: freeTier.id },
  ]
  for (const m of memberSeeds) {
    await prisma.member.upsert({ where: { id: m.id }, update: {}, create: { ...m, tenantId: tenant.id } })
  }

  // Event
  await prisma.event.upsert({
    where: { id: 'demo-np-evt1' },
    update: { title: 'Community Open House', status: 'PUBLISHED' },
    create: {
      id: 'demo-np-evt1', tenantId: tenant.id,
      title: 'Community Open House',
      description: 'Annual open house for all community members.',
      startDate: daysFromNow(14), status: 'PUBLISHED', format: 'IN_PERSON', location: 'Main Hall',
    },
  })

  // Volunteer opportunity
  await prisma.volunteerOpportunity.upsert({
    where: { id: 'demo-np-vol1' },
    update: { title: 'Food Bank Helper', status: 'OPEN' },
    create: {
      id: 'demo-np-vol1', tenantId: tenant.id,
      title: 'Food Bank Helper', description: 'Help sort and distribute food donations.',
      date: daysFromNow(7), status: 'OPEN', capacity: 10, hoursEstimate: 3,
    },
  })

  // Donation campaign
  await prisma.donationCampaign.upsert({
    where: { id: 'demo-np-camp1' },
    update: { title: 'Annual Fund 2026', status: 'ACTIVE' },
    create: {
      id: 'demo-np-camp1', tenantId: tenant.id,
      title: 'Annual Fund 2026', description: 'Support our community programs.',
      goalCents: 1000000, raisedCents: 350000, status: 'ACTIVE',
      endDate: daysFromNow(60),
    },
  })

  console.log(`    members=${memberSeeds.length}, 1 event, 1 volunteer opp, 1 campaign`)
  return tenant
}

async function createBizClub() {
  const tenant = await upsertTenant({ slug: 'demo-bizclub', name: 'Executive Business Club', primaryColor: '#1E3A8A', planSlug: 'growth' })
  console.log(`  Tenant: ${tenant.name}`)

  const annualTier = await prisma.membershipTier.upsert({
    where: { id: `demo-biz-annual` },
    update: { name: 'Annual Member', priceCents: 50000 },
    create: { id: `demo-biz-annual`, tenantId: tenant.id, name: 'Annual Member', priceCents: 50000, interval: 'ANNUAL', color: '#2563EB', benefits: ['Networking events', 'Job board access', 'Newsletter'] },
  })

  const memberSeeds = [
    { id: 'demo-biz-m1', email: 'morgan@demo-bizclub.example.com', firstName: 'Morgan', lastName: 'Lee', status: 'ACTIVE' as const, tierId: annualTier.id },
    { id: 'demo-biz-m2', email: 'priya@demo-bizclub.example.com', firstName: 'Priya', lastName: 'Patel', status: 'ACTIVE' as const, tierId: annualTier.id },
    { id: 'demo-biz-m3', email: 'james@demo-bizclub.example.com', firstName: 'James', lastName: 'Chen', status: 'INACTIVE' as const, tierId: annualTier.id },
    { id: 'demo-biz-m4', email: 'sarah@demo-bizclub.example.com', firstName: 'Sarah', lastName: 'Kim', status: 'ACTIVE' as const, tierId: annualTier.id },
  ]
  for (const m of memberSeeds) {
    await prisma.member.upsert({ where: { id: m.id }, update: {}, create: { ...m, tenantId: tenant.id } })
  }

  await prisma.event.upsert({
    where: { id: 'demo-biz-evt1' },
    update: { title: 'Q2 Networking Mixer', status: 'PUBLISHED' },
    create: {
      id: 'demo-biz-evt1', tenantId: tenant.id,
      title: 'Q2 Networking Mixer', description: 'Quarterly members networking event.',
      startDate: daysFromNow(21), status: 'PUBLISHED', format: 'IN_PERSON', location: 'Downtown Conference Center',
      priceCents: 2500,
    },
  })

  await prisma.club.upsert({
    where: { id: 'demo-biz-club1' },
    update: { name: 'Tech Leaders Circle' },
    create: { id: 'demo-biz-club1', tenantId: tenant.id, name: 'Tech Leaders Circle', description: 'Discussions on enterprise technology.' },
  })

  console.log(`    members=${memberSeeds.length}, 1 event, 1 club`)
  return tenant
}

async function createVolunteerGroup() {
  const tenant = await upsertTenant({ slug: 'demo-volunteers', name: 'Youth Volunteer Network', primaryColor: '#9C27B0', planSlug: 'free' })
  console.log(`  Tenant: ${tenant.name}`)

  await prisma.membershipTier.upsert({
    where: { id: `demo-vol-free` },
    update: { name: 'Volunteer Member', priceCents: 0 },
    create: { id: `demo-vol-free`, tenantId: tenant.id, name: 'Volunteer Member', priceCents: 0, interval: 'ANNUAL' },
  })

  const memberSeeds = [
    { id: 'demo-vol-m1', email: 'alex@demo-volunteers.example.com', firstName: 'Alex', lastName: 'Rivera', status: 'ACTIVE' as const },
    { id: 'demo-vol-m2', email: 'jamie@demo-volunteers.example.com', firstName: 'Jamie', lastName: 'Park', status: 'ACTIVE' as const },
  ]
  for (const m of memberSeeds) {
    await prisma.member.upsert({ where: { id: m.id }, update: {}, create: { ...m, tenantId: tenant.id } })
  }

  const opp = await prisma.volunteerOpportunity.upsert({
    where: { id: 'demo-vol-opp1' },
    update: { title: 'Beach Cleanup', status: 'OPEN' },
    create: {
      id: 'demo-vol-opp1', tenantId: tenant.id,
      title: 'Beach Cleanup', description: 'Monthly beach cleanup initiative.',
      date: daysFromNow(10), status: 'OPEN', capacity: 20, hoursEstimate: 4,
    },
  })

  // Signup
  await prisma.volunteerSignup.upsert({
    where: { opportunityId_memberId: { opportunityId: opp.id, memberId: 'demo-vol-m1' } },
    update: {},
    create: { opportunityId: opp.id, memberId: 'demo-vol-m1', status: 'CONFIRMED', hoursLogged: 4 },
  })

  console.log(`    members=${memberSeeds.length}, 1 volunteer opp`)
  return tenant
}

async function main() {
  console.log('🌱 Simulating multi-tenant demo data...\n')

  await createNonProfit()
  await createBizClub()
  await createVolunteerGroup()

  const total = await prisma.tenant.count()
  console.log(`\n✅ Done. Total tenants in DB: ${total}`)
  console.log('\nRun verify script to check results:')
  console.log('  npx tsx scripts/verify-tenants.ts')
}

main()
  .catch((e) => { console.error('Simulation failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
