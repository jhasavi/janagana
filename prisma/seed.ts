import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create all plans
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { slug: 'STARTER' },
      update: {},
      create: {
        slug: 'STARTER',
        name: 'Starter',
        description: 'Basic plan for small organizations',
        monthlyPriceCents: 0,
        annualPriceCents: 0,
        maxMembers: 100,
        maxUsers: 5,
        maxEvents: 10,
        maxClubs: 5,
        hasCustomDomain: false,
        hasApiAccess: false,
        hasAdvancedReports: false,
        isActive: true,
      },
    }),
    prisma.plan.upsert({
      where: { slug: 'GROWTH' },
      update: {},
      create: {
        slug: 'GROWTH',
        name: 'Growth',
        description: 'For growing organizations',
        monthlyPriceCents: 2900,
        annualPriceCents: 29000,
        maxMembers: 500,
        maxUsers: 10,
        maxEvents: 50,
        maxClubs: 20,
        hasCustomDomain: true,
        hasApiAccess: false,
        hasAdvancedReports: false,
        isActive: true,
      },
    }),
    prisma.plan.upsert({
      where: { slug: 'PRO' },
      update: {},
      create: {
        slug: 'PRO',
        name: 'Pro',
        description: 'For large organizations',
        monthlyPriceCents: 9900,
        annualPriceCents: 99000,
        maxMembers: 999999,
        maxUsers: 25,
        maxEvents: 999999,
        maxClubs: 999999,
        hasCustomDomain: true,
        hasApiAccess: true,
        hasAdvancedReports: true,
        isActive: true,
      },
    }),
  ])

  console.log(`Created ${plans.length} plans`)

  const plan = plans[0]

  // Create a sample tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-organization' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-organization',
      primaryColor: '#2563EB',
      users: {
        create: {
          email: 'demo@janagana.com',
          fullName: 'Demo Admin',
          avatarUrl: null,
          role: 'OWNER',
        },
      },
      subscription: {
        create: {
          planId: plan.id,
          status: 'TRIALING',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          trialEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  })

  console.log('Created tenant:', tenant.name)

  // Create sample members using upsert to avoid unique constraint violations
  const members = await Promise.all([
    prisma.member.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: 'john.smith@example.com',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '+1234567890',
        status: 'ACTIVE',
      },
    }),
    prisma.member.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: 'jane.doe@example.com',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+1234567891',
        status: 'ACTIVE',
      },
    }),
    prisma.member.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: 'bob.johnson@example.com',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@example.com',
        phone: '+1234567892',
        status: 'ACTIVE',
      },
    }),
  ])

  console.log(`Created ${members.length} members`)

  // Create sample events using upsert
  const events = await Promise.all([
    prisma.event.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'annual-meeting' } },
      update: {},
      create: {
        tenantId: tenant.id,
        title: 'Annual Meeting',
        slug: 'annual-meeting',
        description: 'Our yearly general meeting for all members',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: 'Main Hall',
        status: 'PUBLISHED',
        format: 'IN_PERSON',
      },
    }),
    prisma.event.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'community-service-day' } },
      update: {},
      create: {
        tenantId: tenant.id,
        title: 'Community Service Day',
        slug: 'community-service-day',
        description: 'Volunteer opportunity to help the local community',
        startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        location: 'Community Center',
        status: 'PUBLISHED',
        format: 'IN_PERSON',
      },
    }),
  ])

  console.log(`Created ${events.length} events`)

  // Create sample clubs using upsert
  const clubs = await Promise.all([
    prisma.club.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'book-club' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Book Club',
        slug: 'book-club',
        description: 'Monthly book discussions and reviews',
        isActive: true,
      },
    }),
    prisma.club.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'sports-club' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Sports Club',
        slug: 'sports-club',
        description: 'Weekly sports activities and competitions',
        isActive: true,
      },
    }),
  ])

  console.log(`Created ${clubs.length} clubs`)

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
