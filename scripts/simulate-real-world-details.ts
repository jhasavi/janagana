#!/usr/bin/env tsx
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const DRY_RUN = !!process.env.DRY_RUN
if (DRY_RUN) {
  console.log('DRY RUN: simulate-real-world-details would seed detailed activity data for tenants:')
  console.log('- tenant-non-profit')
  console.log('- tenant-business-club')
  console.log('- tenant-volunteer-group')
  console.log('\nNo changes applied in DRY_RUN mode.')
  process.exit(0)
}

const prisma = new PrismaClient()

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

const p: any = prisma as any

async function requireTenant(slug: string) {
  const tenant = await p.tenant.findUnique({ where: { slug } })
  if (!tenant) {
    throw new Error(`Tenant ${slug} not found. Run scripts/simulate-real-world.ts first.`)
  }
  return tenant
}

async function upsertMember(tenantId: string, input: { email: string; firstName: string; lastName: string }) {
  return p.member.upsert({
    where: {
      tenantId_email: {
        tenantId,
        email: input.email,
      },
    },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      status: 'ACTIVE',
    },
    create: {
      tenantId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      status: 'ACTIVE',
    },
  })
}

async function ensureMembershipSubscription(input: {
  id: string
  tenantId: string
  memberId: string
  tierId: string
  annual: boolean
}) {
  return p.membershipSubscription.upsert({
    where: { id: input.id },
    update: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      tierId: input.tierId,
      status: 'ACTIVE',
      billingInterval: input.annual ? 'ANNUAL' : 'MONTHLY',
      renewsAt: input.annual ? daysFromNow(365) : daysFromNow(30),
      canceledAt: null,
      endsAt: null,
    },
    create: {
      id: input.id,
      tenantId: input.tenantId,
      memberId: input.memberId,
      tierId: input.tierId,
      status: 'ACTIVE',
      billingInterval: input.annual ? 'ANNUAL' : 'MONTHLY',
      startedAt: new Date(),
      renewsAt: input.annual ? daysFromNow(365) : daysFromNow(30),
    },
  })
}

async function seedNonProfitDetails() {
  const tenant = await requireTenant('tenant-non-profit')
  const freeTier = await p.membershipTier.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'free-membership' } },
  })
  const paidTier = await p.membershipTier.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'annual-50' } },
  })
  const event = await p.event.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'community-open-house' } },
  })

  if (!freeTier || !paidTier || !event) {
    throw new Error('Non-profit base data missing. Run scripts/simulate-real-world.ts first.')
  }

  const ticket = await p.eventTicket.findFirst({ where: { eventId: event.id } })

  const members = await Promise.all([
    upsertMember(tenant.id, { email: 'sarah@nonprofit.example.com', firstName: 'Sarah', lastName: 'Kim' }),
    upsertMember(tenant.id, { email: 'david@nonprofit.example.com', firstName: 'David', lastName: 'Brown' }),
    upsertMember(tenant.id, { email: 'nina@nonprofit.example.com', firstName: 'Nina', lastName: 'Alvarez' }),
    upsertMember(tenant.id, { email: 'omar@nonprofit.example.com', firstName: 'Omar', lastName: 'Ali' }),
  ])

  await Promise.all([
    ensureMembershipSubscription({
      id: `${tenant.slug}-sub-sarah-free`,
      tenantId: tenant.id,
      memberId: members[0].id,
      tierId: freeTier.id,
      annual: false,
    }),
    ensureMembershipSubscription({
      id: `${tenant.slug}-sub-david-free`,
      tenantId: tenant.id,
      memberId: members[1].id,
      tierId: freeTier.id,
      annual: false,
    }),
    ensureMembershipSubscription({
      id: `${tenant.slug}-sub-nina-paid`,
      tenantId: tenant.id,
      memberId: members[2].id,
      tierId: paidTier.id,
      annual: true,
    }),
    ensureMembershipSubscription({
      id: `${tenant.slug}-sub-omar-paid`,
      tenantId: tenant.id,
      memberId: members[3].id,
      tierId: paidTier.id,
      annual: true,
    }),
  ])

  for (const member of members.slice(0, 3)) {
    await p.eventRegistration.upsert({
      where: {
        eventId_memberId: {
          eventId: event.id,
          memberId: member.id,
        },
      },
      update: {
        tenantId: tenant.id,
        ticketId: ticket?.id,
        status: 'CONFIRMED',
        amountCents: 0,
        canceledAt: null,
      },
      create: {
        tenantId: tenant.id,
        eventId: event.id,
        ticketId: ticket?.id,
        memberId: member.id,
        status: 'CONFIRMED',
        amountCents: 0,
        confirmationCode: `NP-${member.firstName.toUpperCase()}-${Date.now()}`,
      },
    })
  }
}

async function seedBusinessClubDetails() {
  const tenant = await requireTenant('tenant-business-club')
  const tier = await p.membershipTier.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'annual-500' } },
  })
  const event = await p.event.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'paid-networking-night' } },
  })

  if (!tier || !event) {
    throw new Error('Business club base data missing. Run scripts/simulate-real-world.ts first.')
  }

  const ticket = await p.eventTicket.findFirst({ where: { eventId: event.id } })
  if (!ticket) {
    throw new Error('Business club paid event ticket not found.')
  }

  const members = await Promise.all([
    upsertMember(tenant.id, { email: 'host@executiveclub.example.com', firstName: 'Morgan', lastName: 'Lee' }),
    upsertMember(tenant.id, { email: 'ceo@executiveclub.example.com', firstName: 'Priya', lastName: 'Shah' }),
    upsertMember(tenant.id, { email: 'ops@executiveclub.example.com', firstName: 'Carlos', lastName: 'Mendez' }),
    upsertMember(tenant.id, { email: 'sales@executiveclub.example.com', firstName: 'Emily', lastName: 'Ross' }),
  ])

  for (const [index, member] of members.entries()) {
    await ensureMembershipSubscription({
      id: `${tenant.slug}-sub-${index + 1}`,
      tenantId: tenant.id,
      memberId: member.id,
      tierId: tier.id,
      annual: true,
    })
  }

  for (const member of members) {
    await p.eventRegistration.upsert({
      where: {
        eventId_memberId: {
          eventId: event.id,
          memberId: member.id,
        },
      },
      update: {
        tenantId: tenant.id,
        ticketId: ticket.id,
        status: 'CONFIRMED',
        amountCents: ticket.priceCents,
        canceledAt: null,
      },
      create: {
        tenantId: tenant.id,
        eventId: event.id,
        ticketId: ticket.id,
        memberId: member.id,
        status: 'CONFIRMED',
        amountCents: ticket.priceCents,
        confirmationCode: `BC-${member.firstName.toUpperCase()}-${Date.now()}`,
      },
    })
  }
}

async function ensureShift(input: {
  tenantId: string
  opportunityId: string
  name: string
  startsAt: Date
  endsAt: Date
  capacity: number
  location: string
}) {
  const existing = await p.volunteerShift.findFirst({
    where: {
      tenantId: input.tenantId,
      opportunityId: input.opportunityId,
      name: input.name,
    },
  })

  if (existing) {
    return p.volunteerShift.update({
      where: { id: existing.id },
      data: {
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        capacity: input.capacity,
        location: input.location,
        status: 'OPEN',
      },
    })
  }

  return p.volunteerShift.create({
    data: {
      tenantId: input.tenantId,
      opportunityId: input.opportunityId,
      name: input.name,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity,
      location: input.location,
      status: 'OPEN',
    },
  })
}

async function seedVolunteerGroupDetails() {
  const tenant = await requireTenant('tenant-volunteer-group')
  const opportunities = await p.volunteerOpportunity.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'asc' },
  })

  if (opportunities.length < 2) {
    throw new Error('Volunteer group opportunities missing. Run scripts/simulate-real-world.ts first.')
  }

  const members = await p.member.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'asc' } })
  if (members.length < 5) {
    throw new Error('Volunteer group members missing. Run scripts/simulate-real-world.ts first.')
  }

  const firstOpp = opportunities[0]
  const secondOpp = opportunities[1]

  const shifts = await Promise.all([
    ensureShift({
      tenantId: tenant.id,
      opportunityId: firstOpp.id,
      name: 'Morning Distribution Shift',
      startsAt: daysFromNow(8),
      endsAt: daysFromNow(8.3),
      capacity: 4,
      location: firstOpp.location || 'Central Food Bank',
    }),
    ensureShift({
      tenantId: tenant.id,
      opportunityId: secondOpp.id,
      name: 'Saturday Cleanup Shift',
      startsAt: daysFromNow(11),
      endsAt: daysFromNow(11.25),
      capacity: 6,
      location: secondOpp.location || 'Riverfront Park',
    }),
  ])

  for (const member of members) {
    const targetOpp = member.email.includes('ava') || member.email.includes('noah') || member.email.includes('mia')
      ? firstOpp
      : secondOpp

    await p.volunteerApplication.upsert({
      where: {
        opportunityId_memberId: {
          opportunityId: targetOpp.id,
          memberId: member.id,
        },
      },
      update: {
        tenantId: tenant.id,
        status: 'APPROVED',
        reviewedAt: new Date(),
        coverLetter: 'Ready to contribute regularly.',
      },
      create: {
        tenantId: tenant.id,
        opportunityId: targetOpp.id,
        memberId: member.id,
        status: 'APPROVED',
        reviewedAt: new Date(),
        coverLetter: 'Ready to contribute regularly.',
      },
    })
  }

  const assignments = [
    { member: members[0], shift: shifts[0], hours: 3.5 },
    { member: members[1], shift: shifts[0], hours: 3.0 },
    { member: members[2], shift: shifts[0], hours: 2.5 },
    { member: members[3], shift: shifts[1], hours: 2.0 },
    { member: members[4], shift: shifts[1], hours: 2.0 },
  ]

  for (const assignment of assignments) {
    await p.volunteerShiftSignup.upsert({
      where: {
        shiftId_memberId: {
          shiftId: assignment.shift.id,
          memberId: assignment.member.id,
        },
      },
      update: {
        tenantId: tenant.id,
        confirmedAt: new Date(),
        canceledAt: null,
      },
      create: {
        tenantId: tenant.id,
        shiftId: assignment.shift.id,
        memberId: assignment.member.id,
        confirmedAt: new Date(),
      },
    })

    const hourEntry = await p.volunteerHours.findFirst({
      where: {
        tenantId: tenant.id,
        memberId: assignment.member.id,
        shiftId: assignment.shift.id,
      },
    })

    if (hourEntry) {
      await p.volunteerHours.update({
        where: { id: hourEntry.id },
        data: {
          opportunityId: assignment.shift.opportunityId,
          hours: assignment.hours,
          date: assignment.shift.startsAt,
          description: 'Seeded real-world volunteer participation',
          isApproved: true,
          approvedAt: new Date(),
        },
      })
    } else {
      await p.volunteerHours.create({
        data: {
          tenantId: tenant.id,
          memberId: assignment.member.id,
          opportunityId: assignment.shift.opportunityId,
          shiftId: assignment.shift.id,
          hours: assignment.hours,
          date: assignment.shift.startsAt,
          description: 'Seeded real-world volunteer participation',
          isApproved: true,
          approvedAt: new Date(),
        },
      })
    }
  }
}

async function main() {
  console.log('Seeding detailed real-world activity data...')

  await seedNonProfitDetails()
  await seedBusinessClubDetails()
  await seedVolunteerGroupDetails()

  console.log('Detailed simulation complete.')
}

main()
  .catch((error) => {
    console.error('Detailed simulation failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await p.$disconnect()
  })
