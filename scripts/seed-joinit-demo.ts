#!/usr/bin/env tsx
/**
 * Join It / Zeffy demo dataset for pilot tenants (local or staging).
 *
 *   npm run seed:joinit-demo -- --confirm-joinit-demo
 *   npm run seed:joinit-demo -- --tenant=purple-wings --confirm-joinit-demo
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const MARKER = "joinit-demo";
const REQUIRED_FLAG = "--confirm-joinit-demo";

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (arg === REQUIRED_FLAG) out.confirm = true;
    else if (arg.startsWith("--tenant=")) out.tenant = arg.slice("--tenant=".length);
  }
  return out;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.confirm) {
    console.error(`Refusing to seed. Re-run with ${REQUIRED_FLAG}`);
    process.exit(1);
  }

  const tenantSlug = (args.tenant as string) || "purple-wings";
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantSlug}. Run seed:local-clerk or pilot:seed first.`);
  }

  const annualTier = await prisma.membershipTier.upsert({
    where: { id: `${MARKER}-annual-${tenant.id}` },
    update: {
      name: "Annual Member",
      description: "Demo tier for Join It comparison",
      amountCents: 5000,
      interval: "ANNUAL",
      active: true,
    },
    create: {
      id: `${MARKER}-annual-${tenant.id}`,
      tenantId: tenant.id,
      name: "Annual Member",
      description: "Demo tier for Join It comparison",
      amountCents: 5000,
      interval: "ANNUAL",
      active: true,
    },
  });

  const monthlyTier = await prisma.membershipTier.upsert({
    where: { id: `${MARKER}-monthly-${tenant.id}` },
    update: {
      name: "Monthly Supporter",
      amountCents: 1000,
      interval: "MONTHLY",
      active: true,
    },
    create: {
      id: `${MARKER}-monthly-${tenant.id}`,
      tenantId: tenant.id,
      name: "Monthly Supporter",
      amountCents: 1000,
      interval: "MONTHLY",
      active: true,
    },
  });

  for (let i = 0; i < 24; i++) {
    await prisma.contact.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: `${MARKER}-${i}@demo.local` } },
      update: {
        firstName: "Demo",
        lastName: `Contact ${i + 1}`,
        tags: i % 3 === 0 ? ["imported", "raklet", "volunteer"] : ["imported", "newsletter"],
        source: i % 2 === 0 ? "dashboard_raklet_import" : "manual_admin",
        type: i % 5 === 0 ? "MEMBER" : "OTHER",
      },
      create: {
        tenantId: tenant.id,
        firstName: "Demo",
        lastName: `Contact ${i + 1}`,
        email: `${MARKER}-${i}@demo.local`,
        type: i % 5 === 0 ? "MEMBER" : "OTHER",
        source: i % 2 === 0 ? "dashboard_raklet_import" : "manual_admin",
        tags: i % 3 === 0 ? ["imported", "raklet", "volunteer"] : ["imported", "newsletter"],
        lastActivityAt: daysFromNow(-i),
        lastActivitySummary: `Seeded ${MARKER} row ${i + 1}`,
        importedAt: i % 2 === 0 ? new Date() : null,
      },
    });
  }

  const membershipContacts = await prisma.contact.findMany({
    where: { tenantId: tenant.id, email: { startsWith: `${MARKER}-` } },
    take: 6,
    orderBy: { email: "asc" },
  });

  const expiryBuckets = [14, 45, -10, 75, 5, -30];
  for (const [index, contact] of membershipContacts.entries()) {
    const expiresAt = daysFromNow(expiryBuckets[index] ?? 30);
    const tier = index % 2 === 0 ? annualTier : monthlyTier;
    const membershipId = `${MARKER}-membership-${contact.id}`;

    await prisma.membership.upsert({
      where: { id: membershipId },
      update: {
        status: expiresAt < new Date() ? "EXPIRED" : "ACTIVE",
        expiresAt,
        tierId: tier.id,
      },
      create: {
        id: membershipId,
        tenantId: tenant.id,
        contactId: contact.id,
        tierId: tier.id,
        status: expiresAt < new Date() ? "EXPIRED" : "ACTIVE",
        startsAt: daysFromNow(-120),
        expiresAt,
        source: "demo_seed",
      },
    });
  }

  const freeEvent = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: `${MARKER}-community-night` } },
    update: {
      title: "Community Night (Free)",
      status: "PUBLISHED",
      startsAt: daysFromNow(21),
      location: "Community Hall",
      priceCents: 0,
      capacity: 80,
    },
    create: {
      tenantId: tenant.id,
      title: "Community Night (Free)",
      slug: `${MARKER}-community-night`,
      description: "Free demo event for portal registration.",
      startsAt: daysFromNow(21),
      location: "Community Hall",
      status: "PUBLISHED",
      priceCents: 0,
      capacity: 80,
    },
  });

  const paidEvent = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: `${MARKER}-annual-gala` } },
    update: {
      title: "Annual Gala ($25)",
      status: "PUBLISHED",
      startsAt: daysFromNow(35),
      location: "Grand Ballroom",
      priceCents: 2500,
      capacity: 120,
    },
    create: {
      tenantId: tenant.id,
      title: "Annual Gala ($25)",
      slug: `${MARKER}-annual-gala`,
      description: "Paid demo event — Stripe checkout at registration.",
      startsAt: daysFromNow(35),
      location: "Grand Ballroom",
      status: "PUBLISHED",
      priceCents: 2500,
      capacity: 120,
    },
  });

  await prisma.eventTicketType.upsert({
    where: { id: `${MARKER}-gala-ticket-${paidEvent.id}` },
    update: {
      name: "General admission",
      priceCents: 2500,
      memberPriceCents: 2000,
      active: true,
    },
    create: {
      id: `${MARKER}-gala-ticket-${paidEvent.id}`,
      tenantId: tenant.id,
      eventId: paidEvent.id,
      name: "General admission",
      priceCents: 2500,
      memberPriceCents: 2000,
      active: true,
      sortOrder: 0,
    },
  });

  console.log(`Join It demo seed complete for ${tenant.slug}:`);
  console.log(`- 24 contacts tagged imported/raklet`);
  console.log(`- 2 tiers · 6 memberships (expiring + expired)`);
  console.log(`- Events: /portal/${tenant.slug}/register/${freeEvent.slug}`);
  console.log(`- Paid event: /portal/${tenant.slug}/register/${paidEvent.slug}`);
  console.log(`- Renewals desk: /dashboard/memberships/renewals`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
