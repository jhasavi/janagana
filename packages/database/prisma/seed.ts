import { PrismaClient, PlanSlug, BillingInterval, UserRoleType, MemberStatus, EventStatus, EventFormat, RegistrationStatus, VolunteerApplicationStatus, VolunteerShiftStatus, ClubVisibility, ClubRoleType, PaymentStatus, InvoiceStatus, EmailCampaignStatus, AnnouncementStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Starting comprehensive seed…');

  // ──────────────────────────────────────────
  // 1. PLANS
  // ──────────────────────────────────────────
  const planStarter = await prisma.plan.upsert({
    where: { slug: PlanSlug.STARTER },
    update: {},
    create: {
      slug: PlanSlug.STARTER,
      name: 'Starter',
      description: 'Perfect for small clubs and associations just getting started.',
      monthlyPriceCents: 2900,
      annualPriceCents: 29000,
      maxMembers: 100,
      maxUsers: 3,
      maxEvents: 10,
      maxClubs: 5,
      hasCustomDomain: false,
      hasApiAccess: false,
      hasAdvancedReports: false,
    },
  });

  const planGrowth = await prisma.plan.upsert({
    where: { slug: PlanSlug.GROWTH },
    update: {},
    create: {
      slug: PlanSlug.GROWTH,
      name: 'Growth',
      description: 'Ideal for growing organizations with multiple programs.',
      monthlyPriceCents: 7900,
      annualPriceCents: 79000,
      maxMembers: 1000,
      maxUsers: 10,
      maxEvents: 50,
      maxClubs: 25,
      hasCustomDomain: true,
      hasApiAccess: false,
      hasAdvancedReports: true,
    },
  });

  const planPro = await prisma.plan.upsert({
    where: { slug: PlanSlug.PRO },
    update: {},
    create: {
      slug: PlanSlug.PRO,
      name: 'Pro',
      description: 'Full-featured platform for large non-profits and enterprise orgs.',
      monthlyPriceCents: 19900,
      annualPriceCents: 199000,
      maxMembers: 10000,
      maxUsers: 50,
      maxEvents: 500,
      maxClubs: 200,
      hasCustomDomain: true,
      hasApiAccess: true,
      hasAdvancedReports: true,
    },
  });

  const planEnterprise = await prisma.plan.upsert({
    where: { slug: PlanSlug.ENTERPRISE },
    update: {},
    create: {
      slug: PlanSlug.ENTERPRISE,
      name: 'Enterprise',
      description: 'Unlimited everything with dedicated support and custom integrations.',
      monthlyPriceCents: 49900,
      annualPriceCents: 499000,
      maxMembers: 100000,
      maxUsers: 100,
      maxEvents: 1000,
      maxClubs: 500,
      hasCustomDomain: true,
      hasApiAccess: true,
      hasAdvancedReports: true,
    },
  });

  console.log(`  ✅  Plans: ${planStarter.name}, ${planGrowth.name}, ${planPro.name}, ${planEnterprise.name}`);

  // ──────────────────────────────────────────
  // 2. NON-PROFIT ORGANIZATION: Green Earth Foundation
  // ──────────────────────────────────────────
  const greenEarthTenant = await prisma.tenant.upsert({
    where: { slug: 'green-earth' },
    update: {},
    create: {
      slug: 'green-earth',
      name: 'Green Earth Foundation',
      domain: 'greenearth.orgflow.app',
      primaryColor: '#10B981',
      countryCode: 'US',
      timezone: 'America/New_York',
    },
  });

  console.log(`  ✅  Non-Profit Tenant: ${greenEarthTenant.name}`);

  // Green Earth Subscription
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.tenantSubscription.upsert({
    where: { tenantId: greenEarthTenant.id },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      planId: planGrowth.id,
      status: 'ACTIVE',
      billingInterval: BillingInterval.ANNUAL,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  // Green Earth Settings
  await prisma.tenantSettings.upsert({
    where: { tenantId: greenEarthTenant.id },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      primaryColor: '#10B981',
      accentColor: '#059669',
      supportEmail: 'support@greenearth.org',
      websiteUrl: 'https://greenearth.org',
      enableMemberships: true,
      enableEvents: true,
      enableVolunteers: true,
      enableClubs: true,
      enablePayments: true,
      allowPublicMemberDirectory: true,
    },
  });

  // Green Earth Admin Users
  const greenEarthOwner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: greenEarthTenant.id, email: 'sarah.johnson@greenearth.org' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      email: 'sarah.johnson@greenearth.org',
      fullName: 'Sarah Johnson',
      role: UserRoleType.OWNER,
      isActive: true,
      lastLoginAt: new Date(Date.now() - 86400000),
    },
  });

  const greenEarthAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: greenEarthTenant.id, email: 'michael.chen@greenearth.org' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      email: 'michael.chen@greenearth.org',
      fullName: 'Michael Chen',
      role: UserRoleType.ADMIN,
      isActive: true,
      lastLoginAt: new Date(Date.now() - 172800000),
    },
  });

  const greenEarthStaff = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: greenEarthTenant.id, email: 'emily.davis@greenearth.org' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      email: 'emily.davis@greenearth.org',
      fullName: 'Emily Davis',
      role: UserRoleType.STAFF,
      isActive: true,
      lastLoginAt: new Date(Date.now() - 43200000),
    },
  });

  console.log(`  ✅  Green Earth Admins: ${greenEarthOwner.email}, ${greenEarthAdmin.email}, ${greenEarthStaff.email}`);

  // Green Earth Membership Tiers
  const greenEarthTiers = {
    free: await prisma.membershipTier.upsert({
      where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'community-supporter' } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        name: 'Community Supporter',
        slug: 'community-supporter',
        description: 'Free membership to stay connected with our community.',
        monthlyPriceCents: 0,
        annualPriceCents: 0,
        isFree: true,
        isPublic: true,
        sortOrder: 0,
      },
    }),
    basic: await prisma.membershipTier.upsert({
      where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'friend' } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        name: 'Friend',
        slug: 'friend',
        description: 'Support our mission with a small annual contribution.',
        monthlyPriceCents: 208,
        annualPriceCents: 2500,
        isFree: false,
        isPublic: true,
        sortOrder: 1,
      },
    }),
    standard: await prisma.membershipTier.upsert({
      where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'member' } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        name: 'Member',
        slug: 'member',
        description: 'Full membership with event discounts and voting rights.',
        monthlyPriceCents: 625,
        annualPriceCents: 7500,
        isFree: false,
        isPublic: true,
        sortOrder: 2,
      },
    }),
    premium: await prisma.membershipTier.upsert({
      where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'sustaining-member' } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        name: 'Sustaining Member',
        slug: 'sustaining-member',
        description: 'Premium membership with exclusive benefits and recognition.',
        monthlyPriceCents: 1250,
        annualPriceCents: 15000,
        isFree: false,
        isPublic: true,
        sortOrder: 3,
      },
    }),
  };

  console.log(`  ✅  Green Earth Tiers: ${Object.values(greenEarthTiers).map(t => t.name).join(', ')}`);

  // Green Earth Members (30 members across all tiers)
  const greenEarthMembersData = [
    // Premium (5)
    { email: 'alex.williams@email.com', firstName: 'Alex', lastName: 'Williams', tier: greenEarthTiers.premium, status: MemberStatus.ACTIVE },
    { email: 'beth.martinez@email.com', firstName: 'Beth', lastName: 'Martinez', tier: greenEarthTiers.premium, status: MemberStatus.ACTIVE },
    { email: 'charlie.brown@email.com', firstName: 'Charlie', lastName: 'Brown', tier: greenEarthTiers.premium, status: MemberStatus.ACTIVE },
    { email: 'diana.ross@email.com', firstName: 'Diana', lastName: 'Ross', tier: greenEarthTiers.premium, status: MemberStatus.ACTIVE },
    { email: 'edward.king@email.com', firstName: 'Edward', lastName: 'King', tier: greenEarthTiers.premium, status: MemberStatus.ACTIVE },
    // Standard (10)
    { email: 'fiona.garcia@email.com', firstName: 'Fiona', lastName: 'Garcia', tier: greenEarthTiers.standard, status: MemberStatus.ACTIVE },
    { email: 'george.miller@email.com', firstName: 'George', lastName: 'Miller', tier: greenEarthTiers.standard, status: MemberStatus.ACTIVE },
    { email: 'hannah.davis@email.com', firstName: 'Hannah', lastName: 'Davis', tier: greenEarthTiers.standard, status: MemberStatus.ACTIVE },
    { email: 'ian.wilson@email.com', firstName: 'Ian', lastName: 'Wilson', tier: greenEarthTiers.standard, status: MemberStatus.ACTIVE },
    { email: 'julia.anderson@email.com', firstName: 'Julia', lastName: 'Anderson', tier: greenEarthTiers.standard, status: MemberStatus.ACTIVE },
    { email: 'kevin.thomas@email.com', firstName: 'Kevin', lastName: 'Thomas', tier: greenEarthTiers.standard, status: MemberStatus.ACTIVE },
    { email: 'laura.jackson@email.com', firstName: 'Laura', lastName: 'Jackson', tier: greenEarthTiers.standard, status: MemberStatus.ACTIVE },
    { email: 'michael.white@email.com', firstName: 'Michael', lastName: 'White', tier: greenEarthTiers.standard, status: MemberStatus.ACTIVE },
    { email: 'nancy.harris@email.com', firstName: 'Nancy', lastName: 'Harris', tier: greenEarthTiers.standard, status: MemberStatus.ACTIVE },
    { email: 'oliver.martin@email.com', firstName: 'Oliver', lastName: 'Martin', tier: greenEarthTiers.standard, status: MemberStatus.ACTIVE },
    // Basic (8)
    { email: 'patricia.clark@email.com', firstName: 'Patricia', lastName: 'Clark', tier: greenEarthTiers.basic, status: MemberStatus.ACTIVE },
    { email: 'robert.lewis@email.com', firstName: 'Robert', lastName: 'Lewis', tier: greenEarthTiers.basic, status: MemberStatus.ACTIVE },
    { email: 'susan.robinson@email.com', firstName: 'Susan', lastName: 'Robinson', tier: greenEarthTiers.basic, status: MemberStatus.ACTIVE },
    { email: 'thomas.walker@email.com', firstName: 'Thomas', lastName: 'Walker', tier: greenEarthTiers.basic, status: MemberStatus.ACTIVE },
    { email: 'ursula.perez@email.com', firstName: 'Ursula', lastName: 'Perez', tier: greenEarthTiers.basic, status: MemberStatus.ACTIVE },
    { email: 'victor.hall@email.com', firstName: 'Victor', lastName: 'Hall', tier: greenEarthTiers.basic, status: MemberStatus.ACTIVE },
    { email: 'wendy.young@email.com', firstName: 'Wendy', lastName: 'Young', tier: greenEarthTiers.basic, status: MemberStatus.ACTIVE },
    { email: 'xavier.allen@email.com', firstName: 'Xavier', lastName: 'Allen', tier: greenEarthTiers.basic, status: MemberStatus.ACTIVE },
    // Free (7)
    { email: 'yvonne.sanchez@email.com', firstName: 'Yvonne', lastName: 'Sanchez', tier: greenEarthTiers.free, status: MemberStatus.ACTIVE },
    { email: 'zachary.nelson@email.com', firstName: 'Zachary', lastName: 'Nelson', tier: greenEarthTiers.free, status: MemberStatus.ACTIVE },
    { email: 'amanda.hill@email.com', firstName: 'Amanda', lastName: 'Hill', tier: greenEarthTiers.free, status: MemberStatus.ACTIVE },
    { email: 'bruce.ramirez@email.com', firstName: 'Bruce', lastName: 'Ramirez', tier: greenEarthTiers.free, status: MemberStatus.ACTIVE },
    { email: 'carol.campbell@email.com', firstName: 'Carol', lastName: 'Campbell', tier: greenEarthTiers.free, status: MemberStatus.ACTIVE },
    { email: 'david.mitchell@email.com', firstName: 'David', lastName: 'Mitchell', tier: greenEarthTiers.free, status: MemberStatus.ACTIVE },
    { email: 'elizabeth.roberts@email.com', firstName: 'Elizabeth', lastName: 'Roberts', tier: greenEarthTiers.free, status: MemberStatus.ACTIVE },
  ];

  const greenEarthMembers: Awaited<ReturnType<typeof prisma.member.upsert>>[] = [];
  const greenEarthPayments: Awaited<ReturnType<typeof prisma.payment.upsert>>[] = [];

  for (const md of greenEarthMembersData) {
    const member = await prisma.member.upsert({
      where: { tenantId_email: { tenantId: greenEarthTenant.id, email: md.email } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        email: md.email,
        firstName: md.firstName,
        lastName: md.lastName,
        countryCode: 'US',
        status: md.status,
        joinedAt: new Date(Date.now() - Math.random() * 31536000000), // Random date in past year
      },
    });

    const subscription = await prisma.membershipSubscription.upsert({
      where: { stripeSubscriptionId: `ge_sub_${member.id}` },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        memberId: member.id,
        tierId: md.tier.id,
        status: 'ACTIVE',
        billingInterval: BillingInterval.ANNUAL,
        startedAt: new Date(Date.now() - Math.random() * 31536000000),
        stripeSubscriptionId: `ge_sub_${member.id}`,
      },
    });

    greenEarthMembers.push(member);

    // Create payment for paid tiers
    if (!md.tier.isFree) {
      const payment = await prisma.payment.upsert({
        where: { stripePaymentIntentId: `ge_pi_${member.id}` },
        update: {},
        create: {
          tenantId: greenEarthTenant.id,
          memberId: member.id,
          membershipSubscriptionId: subscription.id,
          amountCents: md.tier.annualPriceCents,
          currency: 'USD',
          status: PaymentStatus.SUCCEEDED,
          stripePaymentIntentId: `ge_pi_${member.id}`,
          paidAt: new Date(Date.now() - Math.random() * 31536000000),
          description: `${md.tier.name} membership`,
        },
      });
      greenEarthPayments.push(payment);
    }
  }

  console.log(`  ✅  Green Earth Members: ${greenEarthMembers.length} seeded`);

  // Green Earth Events (5 events: 2 past with attendance, 3 upcoming with registrations)
  const greenEarthEvents = [];
  
  // Past Event 1
  const pastEvent1Start = new Date();
  pastEvent1Start.setDate(pastEvent1Start.getDate() - 30);
  const pastEvent1End = new Date(pastEvent1Start);
  pastEvent1End.setHours(pastEvent1End.getHours() + 4);

  const pastEvent1 = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'spring-cleanup-2024' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      title: 'Spring Community Cleanup 2024',
      slug: 'spring-cleanup-2024',
      description: 'Join us for our annual spring cleanup event across all local parks.',
      status: EventStatus.COMPLETED,
      format: EventFormat.IN_PERSON,
      location: 'Multiple locations across the city',
      startsAt: pastEvent1Start,
      endsAt: pastEvent1End,
      capacity: 200,
      isPublic: true,
      isFeatured: false,
    },
  });
  greenEarthEvents.push(pastEvent1);

  // Attendance for past event 1
  for (let i = 0; i < 15; i++) {
    await prisma.eventAttendance.upsert({
      where: { eventId_memberId: { eventId: pastEvent1.id, memberId: greenEarthMembers[i].id } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        eventId: pastEvent1.id,
        memberId: greenEarthMembers[i].id,
        checkedInAt: new Date(pastEvent1Start.getTime() + 3600000),
        checkedOutAt: new Date(pastEvent1End.getTime() - 3600000),
      },
    });
  }

  // Past Event 2
  const pastEvent2Start = new Date();
  pastEvent2Start.setDate(pastEvent2Start.getDate() - 60);
  const pastEvent2End = new Date(pastEvent2Start);
  pastEvent2End.setHours(pastEvent2End.getHours() + 2);

  const pastEvent2 = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'annual-gala-2024' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      title: 'Annual Fundraising Gala 2024',
      slug: 'annual-gala-2024',
      description: 'Our biggest fundraising event of the year with dinner, auctions, and entertainment.',
      status: EventStatus.COMPLETED,
      format: EventFormat.IN_PERSON,
      location: 'Grand Ballroom, City Center',
      startsAt: pastEvent2Start,
      endsAt: pastEvent2End,
      capacity: 150,
      isPublic: true,
      isFeatured: true,
    },
  });
  greenEarthEvents.push(pastEvent2);

  // Attendance for past event 2
  for (let i = 5; i < 20; i++) {
    await prisma.eventAttendance.upsert({
      where: { eventId_memberId: { eventId: pastEvent2.id, memberId: greenEarthMembers[i].id } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        eventId: pastEvent2.id,
        memberId: greenEarthMembers[i].id,
        checkedInAt: new Date(pastEvent2Start.getTime() + 1800000),
      },
    });
  }

  // Upcoming Event 1
  const upcomingEvent1Start = new Date();
  upcomingEvent1Start.setDate(upcomingEvent1Start.getDate() + 14);
  const upcomingEvent1End = new Date(upcomingEvent1Start);
  upcomingEvent1End.setHours(upcomingEvent1End.getHours() + 3);

  const upcomingEvent1 = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'summer-festival-2025' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      title: 'Summer Environmental Festival 2025',
      slug: 'summer-festival-2025',
      description: 'A day of environmental education, activities, and community fun.',
      status: EventStatus.PUBLISHED,
      format: EventFormat.IN_PERSON,
      location: 'Riverside Park',
      startsAt: upcomingEvent1Start,
      endsAt: upcomingEvent1End,
      capacity: 300,
      isPublic: true,
      isFeatured: true,
    },
  });
  greenEarthEvents.push(upcomingEvent1);

  // Registrations for upcoming event 1
  for (let i = 0; i < 25; i++) {
    await prisma.eventRegistration.upsert({
      where: { eventId_memberId: { eventId: upcomingEvent1.id, memberId: greenEarthMembers[i].id } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        eventId: upcomingEvent1.id,
        memberId: greenEarthMembers[i].id,
        status: RegistrationStatus.CONFIRMED,
        confirmationCode: `CONF-${randomUUID().slice(0, 8).toUpperCase()}`,
        registeredAt: new Date(Date.now() - Math.random() * 604800000),
      },
    });
  }

  // Upcoming Event 2
  const upcomingEvent2Start = new Date();
  upcomingEvent2Start.setDate(upcomingEvent2Start.getDate() + 30);
  const upcomingEvent2End = new Date(upcomingEvent2Start);
  upcomingEvent2End.setHours(upcomingEvent2End.getHours() + 2);

  const upcomingEvent2 = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'tree-planting-ceremony' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      title: 'Tree Planting Ceremony',
      slug: 'tree-planting-ceremony',
      description: 'Help us plant 100 trees to beautify our community.',
      status: EventStatus.PUBLISHED,
      format: EventFormat.IN_PERSON,
      location: 'Memorial Park',
      startsAt: upcomingEvent2Start,
      endsAt: upcomingEvent2End,
      capacity: 50,
      isPublic: true,
      isFeatured: false,
    },
  });
  greenEarthEvents.push(upcomingEvent2);

  // Registrations for upcoming event 2
  for (let i = 10; i < 20; i++) {
    await prisma.eventRegistration.upsert({
      where: { eventId_memberId: { eventId: upcomingEvent2.id, memberId: greenEarthMembers[i].id } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        eventId: upcomingEvent2.id,
        memberId: greenEarthMembers[i].id,
        status: RegistrationStatus.CONFIRMED,
        confirmationCode: `CONF-${randomUUID().slice(0, 8).toUpperCase()}`,
      },
    });
  }

  // Upcoming Event 3
  const upcomingEvent3Start = new Date();
  upcomingEvent3Start.setDate(upcomingEvent3Start.getDate() + 45);
  const upcomingEvent3End = new Date(upcomingEvent3Start);
  upcomingEvent3End.setHours(upcomingEvent3End.getHours() + 1.5);

  const upcomingEvent3 = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'virtual-workshop' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      title: 'Virtual Workshop: Sustainable Living',
      slug: 'virtual-workshop',
      description: 'Learn practical tips for sustainable living from home.',
      status: EventStatus.PUBLISHED,
      format: EventFormat.VIRTUAL,
      virtualUrl: 'https://zoom.us/j/greenearth-workshop',
      startsAt: upcomingEvent3Start,
      endsAt: upcomingEvent3End,
      capacity: 100,
      isPublic: true,
      isFeatured: false,
    },
  });
  greenEarthEvents.push(upcomingEvent3);

  // Registrations for upcoming event 3
  for (let i = 20; i < 28; i++) {
    await prisma.eventRegistration.upsert({
      where: { eventId_memberId: { eventId: upcomingEvent3.id, memberId: greenEarthMembers[i].id } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        eventId: upcomingEvent3.id,
        memberId: greenEarthMembers[i].id,
        status: RegistrationStatus.CONFIRMED,
        confirmationCode: `CONF-${randomUUID().slice(0, 8).toUpperCase()}`,
      },
    });
  }

  console.log(`  ✅  Green Earth Events: ${greenEarthEvents.length} seeded`);

  // Green Earth Volunteer Opportunities (4: 2 open, 1 closed, 1 upcoming)
  const greenEarthVolOpps = [];

  // Open opportunity 1
  const volOpp1Start = new Date();
  volOpp1Start.setDate(volOpp1Start.getDate() + 7);
  const volOpp1End = new Date(volOpp1Start);
  volOpp1End.setDate(volOpp1End.getDate() + 30);

  const volOpp1 = await prisma.volunteerOpportunity.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'park-maintenance-2025' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      title: 'Park Maintenance Program',
      slug: 'park-maintenance-2025',
      description: 'Help maintain our local parks through regular cleanup and landscaping.',
      location: 'Various parks',
      isVirtual: false,
      isActive: true,
      startsAt: volOpp1Start,
      endsAt: volOpp1End,
      totalHours: 20,
    },
  });
  greenEarthVolOpps.push(volOpp1);

  // Shifts for volOpp1
  await prisma.volunteerShift.createMany({
    skipDuplicates: true,
    data: [
      {
        tenantId: greenEarthTenant.id,
        opportunityId: volOpp1.id,
        name: 'Saturday Morning',
        startsAt: new Date(volOpp1Start.getTime() + 86400000 * 7),
        endsAt: new Date(volOpp1Start.getTime() + 86400000 * 7 + 14400000),
        capacity: 10,
        status: VolunteerShiftStatus.OPEN,
      },
      {
        tenantId: greenEarthTenant.id,
        opportunityId: volOpp1.id,
        name: 'Sunday Afternoon',
        startsAt: new Date(volOpp1Start.getTime() + 86400000 * 8),
        endsAt: new Date(volOpp1Start.getTime() + 86400000 * 8 + 14400000),
        capacity: 10,
        status: VolunteerShiftStatus.OPEN,
      },
    ],
  });

  // Applications for volOpp1
  for (let i = 0; i < 5; i++) {
    await prisma.volunteerApplication.upsert({
      where: { opportunityId_memberId: { opportunityId: volOpp1.id, memberId: greenEarthMembers[i].id } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        opportunityId: volOpp1.id,
        memberId: greenEarthMembers[i].id,
        status: VolunteerApplicationStatus.APPROVED,
        reviewedAt: new Date(),
      },
    });
  }

  // Open opportunity 2
  const volOpp2 = await prisma.volunteerOpportunity.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'tutoring-program' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      title: 'Youth Tutoring Program',
      slug: 'tutoring-program',
      description: 'Volunteer tutors needed for after-school math and reading support.',
      location: 'Community Center',
      isVirtual: false,
      isActive: true,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 7776000000), // 90 days
      totalHours: 40,
    },
  });
  greenEarthVolOpps.push(volOpp2);

  // Applications for volOpp2
  for (let i = 5; i < 8; i++) {
    await prisma.volunteerApplication.upsert({
      where: { opportunityId_memberId: { opportunityId: volOpp2.id, memberId: greenEarthMembers[i].id } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        opportunityId: volOpp2.id,
        memberId: greenEarthMembers[i].id,
        status: VolunteerApplicationStatus.PENDING,
      },
    });
  }

  // Closed opportunity
  const volOpp3Start = new Date();
  volOpp3Start.setDate(volOpp3Start.getDate() - 45);
  const volOpp3End = new Date(volOpp3Start);
  volOpp3End.setDate(volOpp3End.getDate() + 30);

  const volOpp3 = await prisma.volunteerOpportunity.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'winter-coat-drive-2024' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      title: 'Winter Coat Drive 2024',
      slug: 'winter-coat-drive-2024',
      description: 'Collect and distribute winter coats for those in need.',
      location: 'Community Center',
      isVirtual: false,
      isActive: false,
      startsAt: volOpp3Start,
      endsAt: volOpp3End,
      totalHours: 15,
    },
  });
  greenEarthVolOpps.push(volOpp3);

  // Volunteer hours for closed opportunity
  for (let i = 10; i < 15; i++) {
    await prisma.volunteerHours.upsert({
      where: { id: `vh_${volOpp3.id}_${greenEarthMembers[i].id}` },
      update: {},
      create: {
        id: `vh_${volOpp3.id}_${greenEarthMembers[i].id}`,
        tenantId: greenEarthTenant.id,
        memberId: greenEarthMembers[i].id,
        opportunityId: volOpp3.id,
        hours: 5,
        date: new Date(volOpp3Start.getTime() + 86400000 * 15),
        isApproved: true,
        approvedAt: new Date(volOpp3End),
      },
    });
  }

  // Upcoming opportunity
  const volOpp4Start = new Date();
  volOpp4Start.setDate(volOpp4Start.getDate() + 60);
  const volOpp4End = new Date(volOpp4Start);
  volOpp4End.setDate(volOpp4End.getDate() + 14);

  const volOpp4 = await prisma.volunteerOpportunity.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'summer-camp-2025' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      title: 'Summer Camp Counselors',
      slug: 'summer-camp-2025',
      description: 'Volunteer counselors needed for our environmental summer camp.',
      location: 'Camp Green Earth',
      isVirtual: false,
      isActive: true,
      startsAt: volOpp4Start,
      endsAt: volOpp4End,
      totalHours: 80,
    },
  });
  greenEarthVolOpps.push(volOpp4);

  console.log(`  ✅  Green Earth Volunteer Opportunities: ${greenEarthVolOpps.length} seeded`);

  // Green Earth Clubs (4 clubs)
  const greenEarthClubs = [];

  const clubEnvironment = await prisma.club.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'environment-advocates' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      name: 'Environment Advocates',
      slug: 'environment-advocates',
      description: 'Advocating for environmental policies and sustainable practices.',
      visibility: ClubVisibility.PUBLIC,
      isActive: true,
    },
  });
  greenEarthClubs.push(clubEnvironment);

  const clubYouth = await prisma.club.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'youth-eco-leaders' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      name: 'Youth Eco-Leaders',
      slug: 'youth-eco-leaders',
      description: 'Empowering young people to become environmental leaders.',
      visibility: ClubVisibility.PUBLIC,
      isActive: true,
    },
  });
  greenEarthClubs.push(clubYouth);

  const clubFundraising = await prisma.club.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'fundraising-team' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      name: 'Fundraising Team',
      slug: 'fundraising-team',
      description: 'Planning and executing fundraising events and campaigns.',
      visibility: ClubVisibility.PUBLIC,
      isActive: true,
    },
  });
  greenEarthClubs.push(clubFundraising);

  const clubSocial = await prisma.club.upsert({
    where: { tenantId_slug: { tenantId: greenEarthTenant.id, slug: 'social-events' } },
    update: {},
    create: {
      tenantId: greenEarthTenant.id,
      name: 'Social Events Committee',
      slug: 'social-events',
      description: 'Organizing social gatherings and community events.',
      visibility: ClubVisibility.PUBLIC,
      isActive: true,
    },
  });
  greenEarthClubs.push(clubSocial);

  // Club memberships
  for (let i = 0; i < 25; i++) {
    const club = greenEarthClubs[i % 4];
    await prisma.clubMembership.upsert({
      where: { clubId_memberId: { clubId: club.id, memberId: greenEarthMembers[i].id } },
      update: {},
      create: {
        tenantId: greenEarthTenant.id,
        clubId: club.id,
        memberId: greenEarthMembers[i].id,
        role: i < 4 ? ClubRoleType.LEADER : ClubRoleType.MEMBER,
      },
    });
  }

  // Club posts
  for (const club of greenEarthClubs) {
    await prisma.clubPost.upsert({
      where: { id: `cp_${club.id}_welcome` },
      update: {},
      create: {
        id: `cp_${club.id}_welcome`,
        tenantId: greenEarthTenant.id,
        clubId: club.id,
        authorId: greenEarthMembers[greenEarthClubs.indexOf(club)].id,
        title: `Welcome to ${club.name}!`,
        body: `This is the official discussion forum for ${club.name}. Feel free to share ideas and collaborate.`,
        isPinned: true,
        publishedAt: new Date(),
      },
    });
  }

  console.log(`  ✅  Green Earth Clubs: ${greenEarthClubs.length} seeded`);

  // Green Earth Email Campaigns (1 sent, 1 draft)
  await prisma.emailCampaign.upsert({
    where: { id: `ec_${greenEarthTenant.id}_spring` },
    update: {},
    create: {
      id: `ec_${greenEarthTenant.id}_spring`,
      tenantId: greenEarthTenant.id,
      name: 'Spring Newsletter',
      subject: 'Green Earth Spring Newsletter',
      bodyHtml: '<h1>Spring Updates</h1><p>Exciting things happening this spring...</p>',
      bodyText: 'Spring Updates - Exciting things happening this spring...',
      fromName: 'Green Earth Foundation',
      fromEmail: 'newsletter@greenearth.org',
      recipientCount: 30,
      status: EmailCampaignStatus.SENT,
      sentAt: new Date(Date.now() - 86400000 * 30),
    },
  });

  await prisma.emailCampaign.upsert({
    where: { id: `ec_${greenEarthTenant.id}_summer` },
    update: {},
    create: {
      id: `ec_${greenEarthTenant.id}_summer`,
      tenantId: greenEarthTenant.id,
      name: 'Summer Events Announcement',
      subject: 'Upcoming Summer Events',
      bodyHtml: '<h1>Summer Events</h1><p>Join us for these exciting events...</p>',
      bodyText: 'Summer Events - Join us for these exciting events...',
      fromName: 'Green Earth Foundation',
      fromEmail: 'newsletter@greenearth.org',
      recipientCount: 0,
      status: EmailCampaignStatus.DRAFT,
    },
  });

  // Green Earth Announcements (2 active)
  await prisma.announcement.upsert({
    where: { id: `ann_${greenEarthTenant.id}_welcome` },
    update: {},
    create: {
      id: `ann_${greenEarthTenant.id}_welcome`,
      tenantId: greenEarthTenant.id,
      title: 'Welcome to Green Earth Foundation!',
      body: 'We are excited to launch our new community platform. Explore our upcoming events and volunteer opportunities.',
      status: AnnouncementStatus.PUBLISHED,
      audience: 'ALL',
      isPinned: true,
      publishedAt: new Date(Date.now() - 86400000 * 7),
    },
  });

  await prisma.announcement.upsert({
    where: { id: `ann_${greenEarthTenant.id}_festival` },
    update: {},
    create: {
      id: `ann_${greenEarthTenant.id}_festival`,
      tenantId: greenEarthTenant.id,
      title: 'Summer Festival Registration Open',
      body: 'Registration is now open for our Summer Environmental Festival. Sign up early to secure your spot!',
      status: AnnouncementStatus.PUBLISHED,
      audience: 'ALL',
      publishedAt: new Date(Date.now() - 86400000),
    },
  });

  // Green Earth Audit Logs (50+ entries)
  for (let i = 0; i < 50; i++) {
    await prisma.auditLog.create({
      data: {
        tenantId: greenEarthTenant.id,
        userId: greenEarthOwner.id,
        action: ['MEMBER_CREATED', 'EVENT_CREATED', 'PAYMENT_RECEIVED', 'CLUB_POSTED'][i % 4],
        description: `System action ${i}`,
        entityType: ['Member', 'Event', 'Payment', 'Club'][i % 4],
        entityId: greenEarthMembers[i % 30]?.id,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      },
    });
  }

  console.log(`  ✅  Green Earth complete with payments, notifications, and audit logs`);

  // ──────────────────────────────────────────
  // 3. FOR-PROFIT ORGANIZATION: Pro Business Network
  // ──────────────────────────────────────────
  const proNetworkTenant = await prisma.tenant.upsert({
    where: { slug: 'pro-network' },
    update: {},
    create: {
      slug: 'pro-network',
      name: 'Pro Business Network',
      domain: 'pronetwork.orgflow.app',
      primaryColor: '#1E40AF',
      countryCode: 'US',
      timezone: 'America/Los_Angeles',
    },
  });

  console.log(`  ✅  For-Profit Tenant: ${proNetworkTenant.name}`);

  // Pro Network Subscription
  await prisma.tenantSubscription.upsert({
    where: { tenantId: proNetworkTenant.id },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      planId: planPro.id,
      status: 'ACTIVE',
      billingInterval: BillingInterval.MONTHLY,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  // Pro Network Settings
  await prisma.tenantSettings.upsert({
    where: { tenantId: proNetworkTenant.id },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      primaryColor: '#1E40AF',
      accentColor: '#3B82F6',
      supportEmail: 'support@pronetwork.com',
      websiteUrl: 'https://pronetwork.com',
      enableMemberships: true,
      enableEvents: true,
      enableVolunteers: true,
      enableClubs: true,
      enablePayments: true,
      allowPublicMemberDirectory: false,
    },
  });

  // Pro Network Admin Users (2)
  const proNetworkOwner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: proNetworkTenant.id, email: 'john.smith@pronetwork.com' } },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      email: 'john.smith@pronetwork.com',
      fullName: 'John Smith',
      role: UserRoleType.OWNER,
      isActive: true,
      lastLoginAt: new Date(Date.now() - 86400000),
    },
  });

  const proNetworkAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: proNetworkTenant.id, email: 'jennifer.lee@pronetwork.com' } },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      email: 'jennifer.lee@pronetwork.com',
      fullName: 'Jennifer Lee',
      role: UserRoleType.ADMIN,
      isActive: true,
      lastLoginAt: new Date(Date.now() - 172800000),
    },
  });

  console.log(`  ✅  Pro Network Admins: ${proNetworkOwner.email}, ${proNetworkAdmin.email}`);

  // Pro Network Membership Tiers (3)
  const proNetworkTiers = {
    starter: await prisma.membershipTier.upsert({
      where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'starter' } },
      update: {},
      create: {
        tenantId: proNetworkTenant.id,
        name: 'Starter',
        slug: 'starter',
        description: 'Basic networking membership for individuals.',
        monthlyPriceCents: 4900,
        annualPriceCents: 49000,
        isFree: false,
        isPublic: true,
        sortOrder: 0,
      },
    }),
    professional: await prisma.membershipTier.upsert({
      where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'professional' } },
      update: {},
      create: {
        tenantId: proNetworkTenant.id,
        name: 'Professional',
        slug: 'professional',
        description: 'Enhanced networking with exclusive events and resources.',
        monthlyPriceCents: 14900,
        annualPriceCents: 149000,
        isFree: false,
        isPublic: true,
        sortOrder: 1,
      },
    }),
    executive: await prisma.membershipTier.upsert({
      where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'executive' } },
      update: {},
      create: {
        tenantId: proNetworkTenant.id,
        name: 'Executive',
        slug: 'executive',
        description: 'Premium membership with VIP access and executive networking.',
        monthlyPriceCents: 29900,
        annualPriceCents: 299000,
        isFree: false,
        isPublic: true,
        sortOrder: 2,
      },
    }),
  };

  console.log(`  ✅  Pro Network Tiers: ${Object.values(proNetworkTiers).map(t => t.name).join(', ')}`);

  // Pro Network Members (20 members)
  const proNetworkMembersData = [
    // Executive (5)
    { email: 'richard.johnson@email.com', firstName: 'Richard', lastName: 'Johnson', tier: proNetworkTiers.executive, status: MemberStatus.ACTIVE },
    { email: 'patricia.williams@email.com', firstName: 'Patricia', lastName: 'Williams', tier: proNetworkTiers.executive, status: MemberStatus.ACTIVE },
    { email: 'robert.brown@email.com', firstName: 'Robert', lastName: 'Brown', tier: proNetworkTiers.executive, status: MemberStatus.ACTIVE },
    { email: 'linda.jones@email.com', firstName: 'Linda', lastName: 'Jones', tier: proNetworkTiers.executive, status: MemberStatus.ACTIVE },
    { email: 'william.garcia@email.com', firstName: 'William', lastName: 'Garcia', tier: proNetworkTiers.executive, status: MemberStatus.ACTIVE },
    // Professional (8)
    { email: 'elizabeth.miller@email.com', firstName: 'Elizabeth', lastName: 'Miller', tier: proNetworkTiers.professional, status: MemberStatus.ACTIVE },
    { email: 'charles.davis@email.com', firstName: 'Charles', lastName: 'Davis', tier: proNetworkTiers.professional, status: MemberStatus.ACTIVE },
    { email: 'barbara.rodriguez@email.com', firstName: 'Barbara', lastName: 'Rodriguez', tier: proNetworkTiers.professional, status: MemberStatus.ACTIVE },
    { email: 'thomas.martinez@email.com', firstName: 'Thomas', lastName: 'Martinez', tier: proNetworkTiers.professional, status: MemberStatus.ACTIVE },
    { email: 'susan.hernandez@email.com', firstName: 'Susan', lastName: 'Hernandez', tier: proNetworkTiers.professional, status: MemberStatus.ACTIVE },
    { email: 'christopher.lopez@email.com', firstName: 'Christopher', lastName: 'Lopez', tier: proNetworkTiers.professional, status: MemberStatus.ACTIVE },
    { email: 'jennifer.gonzalez@email.com', firstName: 'Jennifer', lastName: 'Gonzalez', tier: proNetworkTiers.professional, status: MemberStatus.ACTIVE },
    { email: 'matthew.wilson@email.com', firstName: 'Matthew', lastName: 'Wilson', tier: proNetworkTiers.professional, status: MemberStatus.ACTIVE },
    // Starter (7)
    { email: 'karen.anderson@email.com', firstName: 'Karen', lastName: 'Anderson', tier: proNetworkTiers.starter, status: MemberStatus.ACTIVE },
    { email: 'daniel.thomas@email.com', firstName: 'Daniel', lastName: 'Thomas', tier: proNetworkTiers.starter, status: MemberStatus.ACTIVE },
    { email: 'lisa.taylor@email.com', firstName: 'Lisa', lastName: 'Taylor', tier: proNetworkTiers.starter, status: MemberStatus.ACTIVE },
    { email: 'joseph.moore@email.com', firstName: 'Joseph', lastName: 'Moore', tier: proNetworkTiers.starter, status: MemberStatus.ACTIVE },
    { email: 'nancy.jackson@email.com', firstName: 'Nancy', lastName: 'Jackson', tier: proNetworkTiers.starter, status: MemberStatus.ACTIVE },
    { email: 'mark.martin@email.com', firstName: 'Mark', lastName: 'Martin', tier: proNetworkTiers.starter, status: MemberStatus.ACTIVE },
    { email: 'donna.lee@email.com', firstName: 'Donna', lastName: 'Lee', tier: proNetworkTiers.starter, status: MemberStatus.ACTIVE },
  ];

  const proNetworkMembers: Awaited<ReturnType<typeof prisma.member.upsert>>[] = [];

  for (const md of proNetworkMembersData) {
    const member = await prisma.member.upsert({
      where: { tenantId_email: { tenantId: proNetworkTenant.id, email: md.email } },
      update: {},
      create: {
        tenantId: proNetworkTenant.id,
        email: md.email,
        firstName: md.firstName,
        lastName: md.lastName,
        countryCode: 'US',
        status: md.status,
        joinedAt: new Date(Date.now() - Math.random() * 31536000000),
      },
    });

    await prisma.membershipSubscription.upsert({
      where: { stripeSubscriptionId: `pn_sub_${member.id}` },
      update: {},
      create: {
        tenantId: proNetworkTenant.id,
        memberId: member.id,
        tierId: md.tier.id,
        status: 'ACTIVE',
        billingInterval: BillingInterval.MONTHLY,
        startedAt: new Date(Date.now() - Math.random() * 31536000000),
        stripeSubscriptionId: `pn_sub_${member.id}`,
      },
    });

    proNetworkMembers.push(member);
  }

  console.log(`  ✅  Pro Network Members: ${proNetworkMembers.length} seeded`);

  // Pro Network Events (3 networking events with paid tickets)
  const proNetworkEvents = [];

  const proEvent1Start = new Date();
  proEvent1Start.setDate(proEvent1Start.getDate() + 21);
  const proEvent1End = new Date(proEvent1Start);
  proEvent1End.setHours(proEvent1End.getHours() + 3);

  const proEvent1 = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'executive-networking-dinner' } },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      title: 'Executive Networking Dinner',
      slug: 'executive-networking-dinner',
      description: 'Exclusive dinner for executive members to connect and collaborate.',
      status: EventStatus.PUBLISHED,
      format: EventFormat.IN_PERSON,
      location: 'Rooftop Restaurant, Downtown',
      startsAt: proEvent1Start,
      endsAt: proEvent1End,
      capacity: 50,
      isPublic: true,
      isFeatured: true,
    },
  });
  proNetworkEvents.push(proEvent1);

  await prisma.eventTicket.createMany({
    skipDuplicates: true,
    data: [
      { eventId: proEvent1.id, name: 'Executive Member', priceCents: 0, isFree: true, capacity: 30, sortOrder: 0 },
      { eventId: proEvent1.id, name: 'Professional Member', priceCents: 7500, isFree: false, capacity: 15, sortOrder: 1 },
      { eventId: proEvent1.id, name: 'Non-Member', priceCents: 15000, isFree: false, capacity: 5, sortOrder: 2 },
    ],
  });

  const proEvent2Start = new Date();
  proEvent2Start.setDate(proEvent2Start.getDate() + 35);
  const proEvent2End = new Date(proEvent2Start);
  proEvent2End.setHours(proEvent2End.getHours() + 2);

  const proEvent2 = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'industry-insights-webinar' } },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      title: 'Industry Insights Webinar',
      slug: 'industry-insights-webinar',
      description: 'Monthly webinar featuring industry leaders sharing insights.',
      status: EventStatus.PUBLISHED,
      format: EventFormat.VIRTUAL,
      virtualUrl: 'https://zoom.us/j/pronetwork-webinar',
      startsAt: proEvent2Start,
      endsAt: proEvent2End,
      capacity: 200,
      isPublic: true,
      isFeatured: false,
    },
  });
  proNetworkEvents.push(proEvent2);

  const proEvent3Start = new Date();
  proEvent3Start.setDate(proEvent3Start.getDate() + 60);
  const proEvent3End = new Date(proEvent3Start);
  proEvent3End.setHours(proEvent3End.getHours() + 4);

  const proEvent3 = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'annual-business-summit-2025' } },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      title: 'Annual Business Summit 2025',
      slug: 'annual-business-summit-2025',
      description: 'Our flagship event with keynotes, workshops, and networking.',
      status: EventStatus.PUBLISHED,
      format: EventFormat.IN_PERSON,
      location: 'Convention Center',
      startsAt: proEvent3Start,
      endsAt: proEvent3End,
      capacity: 500,
      isPublic: true,
      isFeatured: true,
    },
  });
  proNetworkEvents.push(proEvent3);

  await prisma.eventTicket.createMany({
    skipDuplicates: true,
    data: [
      { eventId: proEvent3.id, name: 'Executive Pass', priceCents: 49900, isFree: false, capacity: 100, sortOrder: 0 },
      { eventId: proEvent3.id, name: 'Professional Pass', priceCents: 29900, isFree: false, capacity: 300, sortOrder: 1 },
      { eventId: proEvent3.id, name: 'Starter Pass', priceCents: 19900, isFree: false, capacity: 100, sortOrder: 2 },
    ],
  });

  console.log(`  ✅  Pro Network Events: ${proNetworkEvents.length} seeded`);

  // Pro Network Volunteer Opportunities (2 community service)
  const proVolOpp1 = await prisma.volunteerOpportunity.upsert({
    where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'mentorship-program' } },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      title: 'Business Mentorship Program',
      slug: 'mentorship-program',
      description: 'Senior members mentor aspiring entrepreneurs.',
      location: 'Virtual',
      isVirtual: true,
      isActive: true,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 7776000000),
      totalHours: 30,
    },
  });

  const proVolOpp2 = await prisma.volunteerOpportunity.upsert({
    where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'charity-drive' } },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      title: 'Annual Charity Drive',
      slug: 'charity-drive',
      description: 'Organizing charity drives for local non-profits.',
      location: 'Various locations',
      isVirtual: false,
      isActive: true,
      startsAt: new Date(Date.now() + 86400000 * 30),
      endsAt: new Date(Date.now() + 86400000 * 60),
      totalHours: 20,
    },
  });

  console.log(`  ✅  Pro Network Volunteer Opportunities: 2 seeded`);

  // Pro Network Clubs (3 clubs)
  const proClubIndustry = await prisma.club.upsert({
    where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'industry-leaders' } },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      name: 'Industry Leaders',
      slug: 'industry-leaders',
      description: 'Connecting leaders across different industries.',
      visibility: ClubVisibility.PUBLIC,
      isActive: true,
    },
  });

  const proClubLeadership = await prisma.club.upsert({
    where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'leadership-forum' } },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      name: 'Leadership Forum',
      slug: 'leadership-forum',
      description: 'Developing leadership skills through workshops and networking.',
      visibility: ClubVisibility.PUBLIC,
      isActive: true,
    },
  });

  const proClubSocial = await prisma.club.upsert({
    where: { tenantId_slug: { tenantId: proNetworkTenant.id, slug: 'social-networking' } },
    update: {},
    create: {
      tenantId: proNetworkTenant.id,
      name: 'Social Networking',
      slug: 'social-networking',
      description: 'Casual networking events and social activities.',
      visibility: ClubVisibility.PUBLIC,
      isActive: true,
    },
  });

  // Club memberships
  for (let i = 0; i < 15; i++) {
    const clubs = [proClubIndustry, proClubLeadership, proClubSocial];
    await prisma.clubMembership.upsert({
      where: { clubId_memberId: { clubId: clubs[i % 3].id, memberId: proNetworkMembers[i].id } },
      update: {},
      create: {
        tenantId: proNetworkTenant.id,
        clubId: clubs[i % 3].id,
        memberId: proNetworkMembers[i].id,
        role: i < 3 ? ClubRoleType.LEADER : ClubRoleType.MEMBER,
      },
    });
  }

  console.log(`  ✅  Pro Network Clubs: 3 seeded`);

  // ──────────────────────────────────────────
  // 4. API Keys and Webhooks
  // ──────────────────────────────────────────
  // Note: API Keys and Webhooks tables exist in the database but Prisma client
  // needs to be regenerated to include them. This will be added in a future seed update.
  console.log(`  ⏭️  API Keys and Webhooks skipped (tables exist, seeding pending)`);

  // ──────────────────────────────────────────
  // ✅ DONE
  // ──────────────────────────────────────────
  console.log('\n🎉  Comprehensive seed completed successfully!\n');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  NON-PROFIT: Green Earth Foundation');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Admin Users     : 3`);
  console.log(`  Members         : ${greenEarthMembers.length}`);
  console.log(`  Tiers           : 4 (Free, Basic, Standard, Premium)`);
  console.log(`  Events          : ${greenEarthEvents.length} (2 past, 3 upcoming)`);
  console.log(`  Volunteer Opps  : 4 (2 open, 1 closed, 1 upcoming)`);
  console.log(`  Clubs           : 4`);
  console.log(`  Email Campaigns : 2 (1 sent, 1 draft)`);
  console.log(`  Announcements   : 2`);
  console.log(`  Payments        : ${greenEarthPayments.length}+`);
  console.log(`  Audit Logs      : 50+`);
  console.log('');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FOR-PROFIT: Pro Business Network');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Admin Users     : 2`);
  console.log(`  Members         : ${proNetworkMembers.length}`);
  console.log(`  Tiers           : 3 (Starter, Professional, Executive)`);
  console.log(`  Events          : ${proNetworkEvents.length} (networking events)`);
  console.log(`  Volunteer Opps  : 2 (community service)`);
  console.log(`  Clubs           : 3`);
  console.log('');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PLATFORM');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Plans           : 4 (Starter, Growth, Pro, Enterprise)`);
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
