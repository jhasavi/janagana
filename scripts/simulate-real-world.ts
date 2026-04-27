#!/usr/bin/env tsx
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const DRY_RUN = !!process.env.DRY_RUN
if (DRY_RUN) {
  console.log('DRY RUN: simulate-real-world would create tenants:')
  console.log('- tenant-non-profit (Community Non-Profit)')
  console.log('- tenant-business-club (Executive Business Club)')
  console.log('- tenant-volunteer-group (City Volunteer Group)')
  console.log('\nNo changes applied in DRY_RUN mode.')
  process.exit(0)
}

const prisma = new PrismaClient()

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

async function upsertTenant(data: { slug: string; name: string; primaryColor: string }) {
  return prisma.tenant.upsert({
    where: { slug: data.slug },
    update: { name: data.name, primaryColor: data.primaryColor, isActive: true },
    create: {
      slug: data.slug,
      name: data.name,
      primaryColor: data.primaryColor,
      isActive: true,
      clerkOrgId: `demo_${data.slug}`,
      planSlug: 'free',
    },
  })
}

async function createNonProfit() {
  const tenant = await upsertTenant({ slug: 'tenant-non-profit', name: 'Community Non-Profit', primaryColor: '#1E7F5C' })

  const freeTier = await prisma.membershipTier.upsert({
    where: { id: `${tenant.id}-free` },
    update: { name: 'Free Membership', priceCents: 0, interval: 'ANNUAL' },
    create: { id: `${tenant.id}-free`, tenantId: tenant.id, name: 'Free Membership', priceCents: 0, interval: 'ANNUAL' },
  })

  const paidTier = await prisma.membershipTier.upsert({
    where: { id: `${tenant.id}-annual-50` },
    update: { name: '$50 / Year', priceCents: 5000, interval: 'ANNUAL' },
    create: { id: `${tenant.id}-annual-50`, tenantId: tenant.id, name: '$50 / Year', priceCents: 5000, interval: 'ANNUAL' },
  })

  const members = [
    { id: `${tenant.id}-m1`, email: 'sarah@nonprofit.example.com', firstName: 'Sarah', lastName: 'Kim', tierId: freeTier.id },
    { id: `${tenant.id}-m2`, email: 'david@nonprofit.example.com', firstName: 'David', lastName: 'Brown', tierId: freeTier.id },
    { id: `${tenant.id}-m3`, email: 'nina@nonprofit.example.com', firstName: 'Nina', lastName: 'Alvarez', tierId: paidTier.id },
    { id: `${tenant.id}-m4`, email: 'omar@nonprofit.example.com', firstName: 'Omar', lastName: 'Ali', tierId: paidTier.id },
  ]

  for (const m of members) {
    await prisma.member.upsert({ where: { id: m.id }, update: {}, create: { ...m, tenantId: tenant.id, status: 'ACTIVE' } })
  }

  const event = await prisma.event.upsert({
    where: { id: `${tenant.id}-community-open-house` },
    update: { title: 'Community Open House', startDate: daysFromNow(14), endDate: daysFromNow(14), status: 'PUBLISHED', format: 'IN_PERSON' },
    create: { id: `${tenant.id}-community-open-house`, tenantId: tenant.id, title: 'Community Open House', description: 'Free community event', startDate: daysFromNow(14), status: 'PUBLISHED', format: 'IN_PERSON' },
  })

  // Register first two members
  await prisma.eventRegistration.upsert({
    where: { eventId_memberId: { eventId: event.id, memberId: members[0].id } },
    update: {},
    create: { eventId: event.id, memberId: members[0].id, paidAmount: 0 },
  })

  await prisma.eventRegistration.upsert({
    where: { eventId_memberId: { eventId: event.id, memberId: members[1].id } },
    update: {},
    create: { eventId: event.id, memberId: members[1].id, paidAmount: 0 },
  })

  return tenant
}

async function createBusinessClub() {
  const tenant = await upsertTenant({ slug: 'tenant-business-club', name: 'Executive Business Club', primaryColor: '#1E3A8A' })

  const annualTier = await prisma.membershipTier.upsert({
    where: { id: `${tenant.id}-annual-500` },
    update: { name: '$500 / Year', priceCents: 50000, interval: 'ANNUAL' },
    create: { id: `${tenant.id}-annual-500`, tenantId: tenant.id, name: '$500 / Year', priceCents: 50000, interval: 'ANNUAL' },
  })

  const host = await prisma.member.upsert({ where: { id: `${tenant.id}-host` }, update: {}, create: { id: `${tenant.id}-host`, tenantId: tenant.id, email: 'host@executiveclub.example.com', firstName: 'Morgan', lastName: 'Lee', status: 'ACTIVE', tierId: annualTier.id } })

  const event = await prisma.event.upsert({
    where: { id: `${tenant.id}-paid-networking-night` },
    update: { title: 'Paid Networking Night', startDate: daysFromNow(21), endDate: daysFromNow(21), status: 'PUBLISHED', format: 'IN_PERSON', priceCents: 7500 },
    create: { id: `${tenant.id}-paid-networking-night`, tenantId: tenant.id, title: 'Paid Networking Night', description: 'Ticketed networking event', startDate: daysFromNow(21), status: 'PUBLISHED', format: 'IN_PERSON', priceCents: 7500 },
  })

  // create a few members
  const members = [
    { id: `${tenant.id}-m1`, email: 'morgan@executiveclub.example.com', firstName: 'Morgan', lastName: 'Lee', tierId: annualTier.id },
    { id: `${tenant.id}-m2`, email: 'priya@executiveclub.example.com', firstName: 'Priya', lastName: 'Patel', tierId: annualTier.id },
  ]

  for (const m of members) {
    await prisma.member.upsert({ where: { id: m.id }, update: {}, create: { ...m, tenantId: tenant.id, status: 'ACTIVE' } })
  }

  // register host
  await prisma.eventRegistration.upsert({ where: { eventId_memberId: { eventId: event.id, memberId: host.id } }, update: {}, create: { eventId: event.id, memberId: host.id, paidAmount: event.priceCents } })

  return tenant
}

async function createVolunteerGroup() {
  const tenant = await upsertTenant({ slug: 'tenant-volunteer-group', name: 'City Volunteer Group', primaryColor: '#B45309' })

  await prisma.membershipTier.upsert({ where: { id: `${tenant.id}-vol-free` }, update: { name: 'Volunteer Member', priceCents: 0 }, create: { id: `${tenant.id}-vol-free`, tenantId: tenant.id, name: 'Volunteer Member', priceCents: 0, interval: 'ANNUAL' } })

  const memberSeeds = [
    { id: `${tenant.id}-m1`, email: 'ava@cityvolunteers.example.com', firstName: 'Ava', lastName: 'Patel' },
    { id: `${tenant.id}-m2`, email: 'noah@cityvolunteers.example.com', firstName: 'Noah', lastName: 'Garcia' },
    { id: `${tenant.id}-m3`, email: 'mia@cityvolunteers.example.com', firstName: 'Mia', lastName: 'Chen' },
  ]

  for (const m of memberSeeds) {
    await prisma.member.upsert({ where: { id: m.id }, update: {}, create: { ...m, tenantId: tenant.id, status: 'ACTIVE' } })
  }

  const opp1 = await prisma.volunteerOpportunity.upsert({ where: { id: `${tenant.id}-opp1` }, update: { title: 'Food Drive Support', date: daysFromNow(7), location: 'Central Food Bank' }, create: { id: `${tenant.id}-opp1`, tenantId: tenant.id, title: 'Food Drive Support', description: 'Help sort and distribute food donations.', date: daysFromNow(7), location: 'Central Food Bank' } })

  // sign up a volunteer
  await prisma.volunteerSignup.upsert({ where: { opportunityId_memberId: { opportunityId: opp1.id, memberId: memberSeeds[0].id } }, update: {}, create: { opportunityId: opp1.id, memberId: memberSeeds[0].id, status: 'CONFIRMED', hoursLogged: 4 } })

  return tenant
}

async function main() {
  console.log('Simulating real-world multi-tenant data...')

  const [a, b, c] = await Promise.all([createNonProfit(), createBusinessClub(), createVolunteerGroup()])

  console.log('Done. Created tenants:')
  console.log(`- ${a.slug}`)
  console.log(`- ${b.slug}`)
  console.log(`- ${c.slug}`)
}

main()
  .catch((e) => { console.error('Simulation failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
