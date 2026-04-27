/**
 * Seed Script — Janagana v2
 *
 * Seeds realistic demo data for an existing tenant.
 * Usage:
 *   1. Complete onboarding to create your tenant (creates Clerk org + Tenant row)
 *   2. Get your tenant's clerkOrgId from Prisma Studio or logs
 *   3. Run:  SEED_CLERK_ORG_ID=org_xxx npm run db:seed
 */
import { PrismaClient, MemberStatus, EventStatus, EventFormat, VolunteerStatus } from '@prisma/client'
import { addDays, subDays, addMonths } from 'date-fns'

const prisma = new PrismaClient()

const CLERK_ORG_ID = process.env.SEED_CLERK_ORG_ID

async function main() {
  if (!CLERK_ORG_ID) {
    console.log(`
Seed script requires a Clerk Org ID.

Usage:
  SEED_CLERK_ORG_ID=org_xxx npm run db:seed

Steps:
  1. Complete onboarding to create your org
  2. Find your Clerk Org ID in the Clerk dashboard or from logs
  3. Run the command above
    `)
    return
  }

  const tenant = await prisma.tenant.findUnique({ where: { clerkOrgId: CLERK_ORG_ID } })
  if (!tenant) {
    console.error(`No tenant found for Clerk Org ID: ${CLERK_ORG_ID}`)
    console.error('Complete onboarding first, then re-run this script.')
    process.exit(1)
  }

  console.log(`Seeding demo data for tenant: ${tenant.name} (${tenant.id})`)
  const tid = tenant.id
  const now = new Date()

  // ── Membership Tiers ───────────────────────────────────────────────────────
  console.log('  Creating membership tiers...')
  const [freeTier, standardTier, premiumTier] = await Promise.all([
    prisma.membershipTier.upsert({
      where: { id: `seed-tier-free-${tid}` },
      update: {},
      create: {
        id: `seed-tier-free-${tid}`,
        tenantId: tid,
        name: 'Free',
        description: 'Basic community membership',
        priceCents: 0,
        interval: 'ANNUAL',
        color: '#6B7280',
        benefits: ['Access to community events', 'Monthly newsletter'],
        isActive: true,
      },
    }),
    prisma.membershipTier.upsert({
      where: { id: `seed-tier-standard-${tid}` },
      update: {},
      create: {
        id: `seed-tier-standard-${tid}`,
        tenantId: tid,
        name: 'Standard',
        description: 'Full community membership',
        priceCents: 2500,
        interval: 'ANNUAL',
        color: '#4F46E5',
        benefits: ['All Free benefits', 'Voting rights', 'Member directory access', 'Discounted event tickets'],
        isActive: true,
      },
    }),
    prisma.membershipTier.upsert({
      where: { id: `seed-tier-premium-${tid}` },
      update: {},
      create: {
        id: `seed-tier-premium-${tid}`,
        tenantId: tid,
        name: 'Premium',
        description: 'Premium membership with all perks',
        priceCents: 10000,
        interval: 'ANNUAL',
        color: '#F59E0B',
        benefits: ['All Standard benefits', 'Priority event registration', 'Free event tickets (2/year)', 'Direct line to board members'],
        isActive: true,
      },
    }),
  ])

  // ── Members ────────────────────────────────────────────────────────────────
  console.log('  Creating members...')
  const memberData = [
    { firstName: 'Priya',    lastName: 'Sharma',     email: 'priya.sharma@example.com',     status: 'ACTIVE',   tierId: premiumTier.id,  daysAgo: 400 },
    { firstName: 'Raj',      lastName: 'Patel',      email: 'raj.patel@example.com',         status: 'ACTIVE',   tierId: standardTier.id, daysAgo: 320 },
    { firstName: 'Ananya',   lastName: 'Krishnan',   email: 'ananya.k@example.com',          status: 'ACTIVE',   tierId: standardTier.id, daysAgo: 280 },
    { firstName: 'Vikram',   lastName: 'Mehta',      email: 'vmehta@example.com',            status: 'ACTIVE',   tierId: premiumTier.id,  daysAgo: 500 },
    { firstName: 'Kavya',    lastName: 'Nair',       email: 'kavya.nair@example.com',        status: 'ACTIVE',   tierId: standardTier.id, daysAgo: 200 },
    { firstName: 'Arjun',    lastName: 'Gupta',      email: 'arjun.gupta@example.com',       status: 'ACTIVE',   tierId: freeTier.id,     daysAgo: 90  },
    { firstName: 'Meera',    lastName: 'Iyer',       email: 'meera.iyer@example.com',        status: 'ACTIVE',   tierId: freeTier.id,     daysAgo: 60  },
    { firstName: 'Suresh',   lastName: 'Reddy',      email: 'suresh.reddy@example.com',      status: 'INACTIVE', tierId: standardTier.id, daysAgo: 700 },
    { firstName: 'Deepa',    lastName: 'Venkatesh',  email: 'deepa.v@example.com',           status: 'PENDING',  tierId: null,            daysAgo: 5   },
    { firstName: 'Kiran',    lastName: 'Bose',       email: 'kiran.bose@example.com',        status: 'ACTIVE',   tierId: standardTier.id, daysAgo: 150 },
    { firstName: 'Lakshmi',  lastName: 'Sundaram',   email: 'lakshmi.s@example.com',         status: 'ACTIVE',   tierId: premiumTier.id,  daysAgo: 600 },
    { firstName: 'Rahul',    lastName: 'Joshi',      email: 'rahul.joshi@example.com',       status: 'ACTIVE',   tierId: freeTier.id,     daysAgo: 30  },
  ] as const

  const members = await Promise.all(
    memberData.map((m) =>
      prisma.member.upsert({
        where: { tenantId_email: { tenantId: tid, email: m.email } },
        update: {},
        create: {
          tenantId: tid,
          firstName: m.firstName,
          lastName:  m.lastName,
          email:     m.email,
          status:    m.status as MemberStatus,
          tierId:    m.tierId,
          joinedAt:  subDays(now, m.daysAgo),
          renewsAt:  addMonths(subDays(now, m.daysAgo), 12),
          phone:     `617-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        },
      })
    )
  )
  console.log(`  Created ${members.length} members.`)

  // ── Events ─────────────────────────────────────────────────────────────────
  console.log('  Creating events...')
  const events = await Promise.all([
    prisma.event.upsert({
      where: { id: `seed-event-1-${tid}` },
      update: {},
      create: {
        id: `seed-event-1-${tid}`,
        tenantId: tid,
        title: 'Annual Community Gala 2026',
        description: 'Our flagship annual gathering. Celebrate the year with music, food, and community.',
        startDate: addDays(now, 30),
        endDate:   addDays(now, 30),
        location:  'Needham Town Hall, 1471 Highland Ave, Needham MA',
        capacity:  200,
        priceCents: 5000,
        status: 'PUBLISHED' as EventStatus,
        format: 'IN_PERSON' as EventFormat,
        tags: ['gala', 'annual', 'featured'],
      },
    }),
    prisma.event.upsert({
      where: { id: `seed-event-2-${tid}` },
      update: {},
      create: {
        id: `seed-event-2-${tid}`,
        tenantId: tid,
        title: 'Diwali Mela 2026',
        description: 'Join us for a spectacular Diwali celebration with lights, sweets, and cultural performances.',
        startDate: addDays(now, 60),
        endDate:   addDays(now, 60),
        location:  'High Rock School, Needham MA',
        capacity:  300,
        priceCents: 0,
        status: 'DRAFT' as EventStatus,
        format: 'IN_PERSON' as EventFormat,
        tags: ['diwali', 'culture', 'family'],
      },
    }),
    prisma.event.upsert({
      where: { id: `seed-event-3-${tid}` },
      update: {},
      create: {
        id: `seed-event-3-${tid}`,
        tenantId: tid,
        title: 'Board Meeting — Q2 2026',
        description: 'Quarterly board meeting. All Premium and Standard members welcome to observe.',
        startDate: addDays(now, 14),
        endDate:   addDays(now, 14),
        location:  'Virtual',
        virtualLink: 'https://meet.google.com/placeholder',
        capacity:  50,
        priceCents: 0,
        status: 'PUBLISHED' as EventStatus,
        format: 'VIRTUAL' as EventFormat,
        tags: ['board', 'governance'],
      },
    }),
    prisma.event.upsert({
      where: { id: `seed-event-4-${tid}` },
      update: {},
      create: {
        id: `seed-event-4-${tid}`,
        tenantId: tid,
        title: 'Yoga & Wellness Morning',
        description: 'Start your Saturday with community yoga in the park. All levels welcome.',
        startDate: subDays(now, 20),
        endDate:   subDays(now, 20),
        location:  'Needham Town Common',
        capacity:  40,
        priceCents: 0,
        status: 'COMPLETED' as EventStatus,
        format: 'IN_PERSON' as EventFormat,
        tags: ['wellness', 'yoga', 'recurring'],
      },
    }),
    prisma.event.upsert({
      where: { id: `seed-event-5-${tid}` },
      update: {},
      create: {
        id: `seed-event-5-${tid}`,
        tenantId: tid,
        title: 'Indian Classical Music Concert',
        description: 'An evening of classical Carnatic music by award-winning artist Dr. Rajan.',
        startDate: subDays(now, 60),
        endDate:   subDays(now, 60),
        location:  'First Parish Church, Needham MA',
        capacity:  150,
        priceCents: 2500,
        status: 'COMPLETED' as EventStatus,
        format: 'IN_PERSON' as EventFormat,
        tags: ['music', 'culture', 'featured'],
      },
    }),
  ])
  console.log(`  Created ${events.length} events.`)

  // ── Event Registrations ────────────────────────────────────────────────────
  console.log('  Creating event registrations...')
  const activeMembers = members.filter((m) => m.status === 'ACTIVE').slice(0, 7)
  const gala = events[0]
  const boardMeeting = events[2]

  await Promise.all([
    ...activeMembers.map((m) =>
      prisma.eventRegistration.upsert({
        where: { eventId_memberId: { eventId: gala.id, memberId: m.id } },
        update: {},
        create: { eventId: gala.id, memberId: m.id, status: 'CONFIRMED', paidAmount: 5000 },
      })
    ),
    ...activeMembers.slice(0, 4).map((m) =>
      prisma.eventRegistration.upsert({
        where: { eventId_memberId: { eventId: boardMeeting.id, memberId: m.id } },
        update: {},
        create: { eventId: boardMeeting.id, memberId: m.id, status: 'CONFIRMED', paidAmount: 0 },
      })
    ),
  ])

  // ── Volunteer Opportunities ────────────────────────────────────────────────
  console.log('  Creating volunteer opportunities...')
  const opps = await Promise.all([
    prisma.volunteerOpportunity.upsert({
      where: { id: `seed-opp-1-${tid}` },
      update: {},
      create: {
        id: `seed-opp-1-${tid}`,
        tenantId: tid,
        title: 'Gala Setup & Decoration',
        description: 'Help set up the venue, arrange decorations, and prepare tables for the Annual Gala.',
        date: addDays(now, 29),
        endDate: addDays(now, 30),
        location: 'Needham Town Hall',
        capacity: 15,
        hoursEstimate: 6,
        status: 'OPEN' as VolunteerStatus,
        tags: ['setup', 'gala'],
      },
    }),
    prisma.volunteerOpportunity.upsert({
      where: { id: `seed-opp-2-${tid}` },
      update: {},
      create: {
        id: `seed-opp-2-${tid}`,
        tenantId: tid,
        title: 'Community Food Drive',
        description: 'Assist with collecting, sorting, and distributing donations at the annual food drive.',
        date: addDays(now, 10),
        endDate: addDays(now, 10),
        location: 'Needham Public Library',
        capacity: 10,
        hoursEstimate: 4,
        status: 'OPEN' as VolunteerStatus,
        tags: ['food', 'community', 'recurring'],
      },
    }),
    prisma.volunteerOpportunity.upsert({
      where: { id: `seed-opp-3-${tid}` },
      update: {},
      create: {
        id: `seed-opp-3-${tid}`,
        tenantId: tid,
        title: 'Website Committee',
        description: 'Help maintain and improve the organization website. Web design or coding skills helpful.',
        date: null,
        location: 'Remote',
        capacity: 5,
        hoursEstimate: 2,
        status: 'OPEN' as VolunteerStatus,
        tags: ['tech', 'ongoing'],
      },
    }),
    prisma.volunteerOpportunity.upsert({
      where: { id: `seed-opp-4-${tid}` },
      update: {},
      create: {
        id: `seed-opp-4-${tid}`,
        tenantId: tid,
        title: 'Diwali Mela Volunteer Crew',
        description: 'Help organize Diwali Mela: stall setup, registration, kids activities, and crowd management.',
        date: addDays(now, 59),
        endDate: addDays(now, 60),
        location: 'High Rock School',
        capacity: 25,
        hoursEstimate: 8,
        status: 'OPEN' as VolunteerStatus,
        tags: ['diwali', 'event-support'],
      },
    }),
  ])

  // ── Volunteer Signups ──────────────────────────────────────────────────────
  console.log('  Creating volunteer signups...')
  const galaOpp = opps[0]
  await Promise.all(
    members.slice(0, 4).map((m) =>
      prisma.volunteerSignup.upsert({
        where: { opportunityId_memberId: { opportunityId: galaOpp.id, memberId: m.id } },
        update: {},
        create: {
          opportunityId: galaOpp.id,
          memberId:      m.id,
          status:        'CONFIRMED',
          hoursLogged:   null,
          notes:         null,
        },
      })
    )
  )

  console.log('')
  console.log('✅ Seed complete!')
  console.log(`   Tiers:    3`)
  console.log(`   Members:  ${members.length}`)
  console.log(`   Events:   ${events.length}`)
  console.log(`   Opps:     ${opps.length}`)
  console.log('')
  console.log('View in Prisma Studio: npm run db:studio')
}

main()
  .then(() => {
    prisma.$disconnect()
  })
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
