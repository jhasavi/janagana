#!/usr/bin/env tsx
/**
 * Seed script for The Purple Wings tenant.
 *
 * Creates the purple-wings tenant and seeds upcoming Spring 2026 events
 * so the embed widget at ThePurpleWings.org can display real data.
 *
 * Usage:
 *   npx tsx scripts/seed-purple-wings.ts
 *   npx tsx scripts/seed-purple-wings.ts --dry-run
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(18, 0, 0, 0) // 6 PM
  return d
}

function hoursAfter(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

async function main() {
  if (DRY_RUN) {
    console.log('DRY RUN — no changes applied.')
    console.log('Would create:')
    console.log('  tenant: purple-wings (The Purple Wings)')
    console.log('  events: Spring 2026 Financial Education Series (3 sessions)')
    return
  }

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'purple-wings' },
    update: { name: 'The Purple Wings', isActive: true },
    create: {
      slug: 'purple-wings',
      name: 'The Purple Wings',
      primaryColor: '#7C3AED',
      timezone: 'America/New_York',
      isActive: true,
      clerkOrgId: 'demo_purple-wings',
      planSlug: 'free',
    },
  })

  console.log(`✓ Tenant: ${tenant.name} (slug: ${tenant.slug}, id: ${tenant.id})`)

  // ── Spring 2026 Upcoming Events ───────────────────────────────────────────
  const upcomingEvents = [
    {
      id: `${tenant.id}-spring2026-s1`,
      title: 'Spring 2026: Foundations of Personal Finance',
      shortSummary: 'Budgeting, credit scores, emergency funds, and banking basics. The perfect starting point for your financial journey.',
      description: 'Join us for the first session of our Spring 2026 Financial Education Series. We will cover the fundamentals every woman needs: building a budget that actually works, understanding and improving your credit score, setting up your first emergency fund, and navigating banking options. Interactive Q&A included.',
      speakerName: 'Purple Wings Financial Education Team',
      tags: ['Financial Basics'],
      startDate: daysFromNow(7),
      location: 'High Rock School, 77 Ferndale Road, Needham, MA',
      coverImageUrl: 'https://www.thepurplewings.org/images/learners-1.jpg',
    },
    {
      id: `${tenant.id}-spring2026-s2`,
      title: 'Spring 2026: Investing & Retirement Planning',
      shortSummary: 'Stock market fundamentals, 401k/IRA strategies, and long-term wealth building — from practical experts.',
      description: 'Learn how to make your money work for you. This session covers stock market fundamentals, the difference between 401k and IRA accounts, portfolio diversification strategies, and how to start investing even on a limited budget. Expert speakers will share actionable advice you can implement immediately.',
      speakerName: 'Vikram - Investment Specialist',
      tags: ['Investing'],
      startDate: daysFromNow(14),
      location: 'High Rock School, 77 Ferndale Road, Needham, MA',
      coverImageUrl: 'https://www.thepurplewings.org/images/learners-2.jpg',
    },
    {
      id: `${tenant.id}-spring2026-s3`,
      title: 'Spring 2026: Real Estate & Tax Strategies',
      shortSummary: 'How to use real estate to build wealth, reduce taxes, and fund retirement — strategies that work for women.',
      description: 'Real estate and tax planning are two of the most powerful wealth-building tools available. This session covers how to evaluate real estate investment opportunities, mortgage strategies, REITs, and legal tax reduction techniques including deductions, retirement accounts, and year-end planning.',
      speakerName: 'Sanjeev - Real Estate Investment Expert & Jan - Tax Planning Specialist',
      tags: ['Real Estate', 'Taxes'],
      startDate: daysFromNow(21),
      location: 'High Rock School, 77 Ferndale Road, Needham, MA',
      coverImageUrl: 'https://www.thepurplewings.org/images/learners-3.jpg',
    },
  ]

  for (const ev of upcomingEvents) {
    const start = ev.startDate
    const end = hoursAfter(start, 2)
    await prisma.event.upsert({
      where: { id: ev.id },
      update: {
        title: ev.title,
        shortSummary: ev.shortSummary,
        description: ev.description,
        speakerName: ev.speakerName,
        startDate: start,
        endDate: end,
        location: ev.location,
        coverImageUrl: ev.coverImageUrl,
        tags: ev.tags,
        status: 'PUBLISHED',
        format: 'IN_PERSON',
        priceCents: 0,
      },
      create: {
        id: ev.id,
        tenantId: tenant.id,
        title: ev.title,
        shortSummary: ev.shortSummary,
        description: ev.description,
        speakerName: ev.speakerName,
        startDate: start,
        endDate: end,
        location: ev.location,
        coverImageUrl: ev.coverImageUrl,
        tags: ev.tags,
        status: 'PUBLISHED',
        format: 'IN_PERSON',
        priceCents: 0,
      },
    })
    console.log(`  ✓ Event: ${ev.title}`)
  }

  // ── Past Events (Spring 2026 completed) ───────────────────────────────────
  const pastEvents = [
    {
      id: `${tenant.id}-fall2024-basics`,
      title: 'Basics of Finance',
      shortSummary: 'Essential introduction to personal finance: banking basics, budgeting, credit scores, and emergency funds.',
      speakerName: 'Bank of America Financial Education Team',
      tags: ['Financial Basics'],
      startDate: new Date('2024-10-03T18:00:00-04:00'),
      location: 'High Rock School, 77 Ferndale Road, Needham, MA',
      coverImageUrl: 'https://www.thepurplewings.org/images/Class-1.jpeg',
      attendeeCount: 45,
    },
    {
      id: `${tenant.id}-fall2024-investing`,
      title: 'Investing in Stocks and Building Retirement',
      shortSummary: 'Stock market fundamentals and retirement planning: 401k, IRA, portfolio diversification, and long-term wealth building.',
      speakerName: 'Vikram - Investment Specialist',
      tags: ['Investing'],
      startDate: new Date('2024-10-10T18:00:00-04:00'),
      location: 'High Rock School, 77 Ferndale Road, Needham, MA',
      coverImageUrl: 'https://www.thepurplewings.org/images/Class-2.jpg',
      attendeeCount: 42,
    },
    {
      id: `${tenant.id}-fall2024-insurance`,
      title: 'How Life Insurance Builds Assets',
      shortSummary: 'Explored term, whole, and universal life insurance strategies and how they contribute to wealth-building.',
      speakerName: 'Padma - Insurance Specialist',
      tags: ['Insurance'],
      startDate: new Date('2024-10-17T18:00:00-04:00'),
      location: 'High Rock School, 77 Ferndale Road, Needham, MA',
      coverImageUrl: 'https://www.thepurplewings.org/images/Class-3.jpg',
      attendeeCount: 38,
    },
    {
      id: `${tenant.id}-fall2024-realestate`,
      title: 'Real Estate for Retirement and College Planning',
      shortSummary: 'Practical approaches to using real estate investment for retirement income and college funding.',
      speakerName: 'Sanjeev - Real Estate Investment Expert',
      tags: ['Real Estate'],
      startDate: new Date('2024-10-24T18:00:00-04:00'),
      location: 'High Rock School, 77 Ferndale Road, Needham, MA',
      coverImageUrl: 'https://www.thepurplewings.org/images/Class-4.jpeg',
      attendeeCount: 48,
    },
    {
      id: `${tenant.id}-fall2024-taxes`,
      title: 'Tax Saving Strategies',
      shortSummary: 'Legal tax reduction strategies, deductions, credits, year-end planning, and retirement account benefits.',
      speakerName: 'Jan - Tax Planning Specialist',
      tags: ['Taxes'],
      startDate: new Date('2024-11-07T18:00:00-05:00'),
      location: 'High Rock School, 77 Ferndale Road, Needham, MA',
      coverImageUrl: 'https://www.thepurplewings.org/images/seminar.jpg',
      attendeeCount: 45,
    },
    {
      id: `${tenant.id}-fall2024-mortgage`,
      title: 'Making Real Estate Work with the Right Mortgage',
      shortSummary: 'How to choose the right mortgage and use real estate to build wealth. Fixed vs. adjustable, refinancing, and strategic financing.',
      speakerName: 'Darren - Mortgage Specialist',
      tags: ['Real Estate'],
      startDate: new Date('2024-11-14T18:00:00-05:00'),
      location: 'High Rock School, 77 Ferndale Road, Needham, MA',
      coverImageUrl: 'https://www.thepurplewings.org/images/team.jpg',
      attendeeCount: 43,
    },
  ]

  for (const ev of pastEvents) {
    await prisma.event.upsert({
      where: { id: ev.id },
      update: {
        title: ev.title,
        shortSummary: ev.shortSummary,
        speakerName: ev.speakerName,
        attendeeCount: ev.attendeeCount,
        startDate: ev.startDate,
        endDate: hoursAfter(ev.startDate, 2),
        location: ev.location,
        coverImageUrl: ev.coverImageUrl,
        tags: ev.tags,
        status: 'COMPLETED',
        format: 'IN_PERSON',
        priceCents: 0,
      },
      create: {
        id: ev.id,
        tenantId: tenant.id,
        title: ev.title,
        shortSummary: ev.shortSummary,
        speakerName: ev.speakerName,
        attendeeCount: ev.attendeeCount,
        startDate: ev.startDate,
        endDate: hoursAfter(ev.startDate, 2),
        location: ev.location,
        coverImageUrl: ev.coverImageUrl,
        tags: ev.tags,
        status: 'COMPLETED',
        format: 'IN_PERSON',
        priceCents: 0,
      },
    })
    console.log(`  ✓ Past event: ${ev.title}`)
  }

  console.log('\n✅ Purple Wings seeded successfully.')
  console.log(`\nTest the embed API:`)
  console.log(`  Upcoming: curl "https://janagana.namasteneedham.com/api/embed/events?tenantSlug=purple-wings"`)
  console.log(`  Past:     curl "https://janagana.namasteneedham.com/api/embed/past-events?tenantSlug=purple-wings"`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
