import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

async function upsertTenant(input: { slug: string; name: string; primaryColor: string }) {
  const tenant = await prisma.tenant.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      primaryColor: input.primaryColor,
      isActive: true,
    },
    create: {
      slug: input.slug,
      name: input.name,
      primaryColor: input.primaryColor,
      isActive: true,
    },
  })

  // Keep one owner-style user per tenant so there is visible admin context in app data.
  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: `owner+${input.slug}@example.com`,
      },
    },
    update: {
      fullName: `${input.name} Owner`,
      role: 'OWNER',
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      email: `owner+${input.slug}@example.com`,
      fullName: `${input.name} Owner`,
      role: 'OWNER',
      isActive: true,
    },
  })

  return tenant
}

async function createOrg1NonProfit() {
  const tenant = await upsertTenant({
    slug: 'tenant-non-profit',
    name: 'Community Non-Profit',
    primaryColor: '#1E7F5C',
  })

  await prisma.membershipTier.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'free-membership' } },
    update: {
      name: 'Free Membership',
      description: 'Entry tier for all supporters',
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      isFree: true,
      isPublic: true,
      sortOrder: 1,
    },
    create: {
      tenantId: tenant.id,
      name: 'Free Membership',
      slug: 'free-membership',
      description: 'Entry tier for all supporters',
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      isFree: true,
      isPublic: true,
      sortOrder: 1,
    },
  })

  await prisma.membershipTier.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'annual-50' } },
    update: {
      name: '$50 / Year',
      description: 'Supporter tier',
      monthlyPriceCents: 0,
      annualPriceCents: 5000,
      isFree: false,
      isPublic: true,
      sortOrder: 2,
    },
    create: {
      tenantId: tenant.id,
      name: '$50 / Year',
      slug: 'annual-50',
      description: 'Supporter tier',
      monthlyPriceCents: 0,
      annualPriceCents: 5000,
      isFree: false,
      isPublic: true,
      sortOrder: 2,
    },
  })

  const event = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'community-open-house' } },
    update: {
      title: 'Community Open House',
      description: 'Upcoming free event for community members',
      status: 'PUBLISHED',
      format: 'IN_PERSON',
      location: 'Main Community Hall',
      startsAt: daysFromNow(14),
      endsAt: daysFromNow(14),
      isPublic: true,
    },
    create: {
      tenantId: tenant.id,
      title: 'Community Open House',
      slug: 'community-open-house',
      description: 'Upcoming free event for community members',
      status: 'PUBLISHED',
      format: 'IN_PERSON',
      location: 'Main Community Hall',
      startsAt: daysFromNow(14),
      endsAt: daysFromNow(14),
      isPublic: true,
    },
  })

  await prisma.eventTicket.upsert({
    where: {
      id: `${event.id}-free-general`,
    },
    update: {
      name: 'General Admission',
      description: 'Free ticket',
      priceCents: 0,
      isFree: true,
      sortOrder: 1,
    },
    create: {
      id: `${event.id}-free-general`,
      eventId: event.id,
      name: 'General Admission',
      description: 'Free ticket',
      priceCents: 0,
      isFree: true,
      sortOrder: 1,
    },
  })

  return tenant
}

async function createOrg2BusinessClub() {
  const tenant = await upsertTenant({
    slug: 'tenant-business-club',
    name: 'Executive Business Club',
    primaryColor: '#1E3A8A',
  })

  const annualTier = await prisma.membershipTier.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'annual-500' } },
    update: {
      name: '$500 / Year',
      description: 'Business club annual membership',
      monthlyPriceCents: 0,
      annualPriceCents: 50000,
      isFree: false,
      isPublic: true,
      sortOrder: 1,
    },
    create: {
      tenantId: tenant.id,
      name: '$500 / Year',
      slug: 'annual-500',
      description: 'Business club annual membership',
      monthlyPriceCents: 0,
      annualPriceCents: 50000,
      isFree: false,
      isPublic: true,
      sortOrder: 1,
    },
  })

  const hostMember = await prisma.member.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'host@executiveclub.example.com',
      },
    },
    update: {
      firstName: 'Morgan',
      lastName: 'Lee',
      status: 'ACTIVE',
    },
    create: {
      tenantId: tenant.id,
      email: 'host@executiveclub.example.com',
      firstName: 'Morgan',
      lastName: 'Lee',
      status: 'ACTIVE',
    },
  })

  await prisma.membershipSubscription.upsert({
    where: {
      id: `${tenant.id}-business-host-sub`,
    },
    update: {
      status: 'ACTIVE',
      billingInterval: 'ANNUAL',
      tierId: annualTier.id,
      memberId: hostMember.id,
    },
    create: {
      id: `${tenant.id}-business-host-sub`,
      tenantId: tenant.id,
      memberId: hostMember.id,
      tierId: annualTier.id,
      status: 'ACTIVE',
      billingInterval: 'ANNUAL',
      startedAt: new Date(),
      renewsAt: daysFromNow(365),
    },
  })

  const event = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'paid-networking-night' } },
    update: {
      title: 'Paid Networking Night',
      description: 'Ticketed networking event for professionals',
      status: 'PUBLISHED',
      format: 'IN_PERSON',
      location: 'Downtown Conference Center',
      startsAt: daysFromNow(21),
      endsAt: daysFromNow(21),
      isPublic: true,
    },
    create: {
      tenantId: tenant.id,
      title: 'Paid Networking Night',
      slug: 'paid-networking-night',
      description: 'Ticketed networking event for professionals',
      status: 'PUBLISHED',
      format: 'IN_PERSON',
      location: 'Downtown Conference Center',
      startsAt: daysFromNow(21),
      endsAt: daysFromNow(21),
      isPublic: true,
    },
  })

  await prisma.eventTicket.upsert({
    where: {
      id: `${event.id}-paid-standard`,
    },
    update: {
      name: 'Standard Ticket',
      description: 'Paid admission',
      priceCents: 7500,
      isFree: false,
      sortOrder: 1,
    },
    create: {
      id: `${event.id}-paid-standard`,
      eventId: event.id,
      name: 'Standard Ticket',
      description: 'Paid admission',
      priceCents: 7500,
      isFree: false,
      sortOrder: 1,
    },
  })

  return tenant
}

async function createOrg3VolunteerGroup() {
  const tenant = await upsertTenant({
    slug: 'tenant-volunteer-group',
    name: 'City Volunteer Group',
    primaryColor: '#B45309',
  })

  const memberSeeds = [
    { firstName: 'Ava', lastName: 'Patel', email: 'ava@cityvolunteers.example.com' },
    { firstName: 'Noah', lastName: 'Garcia', email: 'noah@cityvolunteers.example.com' },
    { firstName: 'Mia', lastName: 'Chen', email: 'mia@cityvolunteers.example.com' },
    { firstName: 'Ethan', lastName: 'Nguyen', email: 'ethan@cityvolunteers.example.com' },
    { firstName: 'Liam', lastName: 'Johnson', email: 'liam@cityvolunteers.example.com' },
  ]

  for (const member of memberSeeds) {
    await prisma.member.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: member.email,
        },
      },
      update: {
        firstName: member.firstName,
        lastName: member.lastName,
        status: 'ACTIVE',
      },
      create: {
        tenantId: tenant.id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        status: 'ACTIVE',
      },
    })
  }

  await prisma.volunteerOpportunity.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'food-drive-support' } },
    update: {
      title: 'Food Drive Support',
      description: 'Organize and distribute food packages',
      location: 'Central Food Bank',
      isVirtual: false,
      isActive: true,
      startsAt: daysFromNow(7),
      endsAt: daysFromNow(37),
    },
    create: {
      tenantId: tenant.id,
      title: 'Food Drive Support',
      slug: 'food-drive-support',
      description: 'Organize and distribute food packages',
      location: 'Central Food Bank',
      isVirtual: false,
      isActive: true,
      startsAt: daysFromNow(7),
      endsAt: daysFromNow(37),
    },
  })

  await prisma.volunteerOpportunity.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'park-cleanup-crew' } },
    update: {
      title: 'Park Cleanup Crew',
      description: 'Weekly cleanup effort at local parks',
      location: 'Riverfront Park',
      isVirtual: false,
      isActive: true,
      startsAt: daysFromNow(10),
      endsAt: daysFromNow(40),
    },
    create: {
      tenantId: tenant.id,
      title: 'Park Cleanup Crew',
      slug: 'park-cleanup-crew',
      description: 'Weekly cleanup effort at local parks',
      location: 'Riverfront Park',
      isVirtual: false,
      isActive: true,
      startsAt: daysFromNow(10),
      endsAt: daysFromNow(40),
    },
  })

  return tenant
}

async function main() {
  console.log('Simulating real-world multi-tenant data...')

  const [org1, org2, org3] = await Promise.all([
    createOrg1NonProfit(),
    createOrg2BusinessClub(),
    createOrg3VolunteerGroup(),
  ])

  console.log('Done.')
  console.log(`Created/updated tenants:`)
  console.log(`- ${org1.name} (${org1.slug})`)
  console.log(`- ${org2.name} (${org2.slug})`)
  console.log(`- ${org3.name} (${org3.slug})`)
}

main()
  .catch((error) => {
    console.error('Simulation failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
