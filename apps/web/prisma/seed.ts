import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create a plan first (or use existing)
  let plan = await prisma.plan.findUnique({
    where: { slug: 'STARTER' },
  })

  if (!plan) {
    plan = await prisma.plan.create({
      data: {
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
    })
    console.log('Created plan:', plan.name)
  }

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

  // Create sample members
  const members = await Promise.all([
    prisma.member.create({
      data: {
        tenantId: tenant.id,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '+1234567890',
        status: 'ACTIVE',
      },
    }),
    prisma.member.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+1234567891',
        status: 'ACTIVE',
      },
    }),
    prisma.member.create({
      data: {
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

  // Create sample events
  const events = await Promise.all([
    prisma.event.create({
      data: {
        tenantId: tenant.id,
        title: 'Annual Meeting',
        slug: 'annual-meeting-' + Date.now(),
        description: 'Our yearly general meeting for all members',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: 'Main Hall',
        status: 'PUBLISHED',
        format: 'IN_PERSON',
      },
    }),
    prisma.event.create({
      data: {
        tenantId: tenant.id,
        title: 'Community Service Day',
        slug: 'community-service-day-' + Date.now(),
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

  // Create sample clubs
  const clubs = await Promise.all([
    prisma.club.create({
      data: {
        tenantId: tenant.id,
        name: 'Book Club',
        slug: 'book-club-' + Date.now(),
        description: 'Monthly book discussions and reviews',
        isActive: true,
      },
    }),
    prisma.club.create({
      data: {
        tenantId: tenant.id,
        name: 'Sports Club',
        slug: 'sports-club-' + Date.now(),
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
