#!/usr/bin/env tsx
/**
 * Automated TPW production loop (DB + public registration action).
 *   npm run verify:tpw-loop -- --production
 */
import { PrismaClient } from "@prisma/client";
import { registerPublicEvent } from "@/lib/actions/public-portal";
import { loadPilotEnvFiles, resolveDatabaseUrl } from "./lib/pilot-script-utils";

const SLUG = "purple-wings";

const prisma = new PrismaClient();

async function main() {
  loadPilotEnvFiles("production");
  const url = resolveDatabaseUrl("production");
  if (!url) throw new Error("PRODUCTION_DATABASE_URL missing");
  process.env.DATABASE_URL = url;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: SLUG },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      clerkOrgId: true,
      _count: {
        select: {
          tenantAdmins: true,
          tiers: true,
          contacts: true,
          events: true,
          registrations: true,
        },
      },
    },
  });

  if (!tenant || tenant.status !== "ACTIVE") {
    throw new Error("TPW tenant missing or not ACTIVE");
  }

  console.log("1. Tenant resolves:", tenant.name, tenant.slug);
  console.log("2. Counts:", tenant._count);
  if (tenant._count.contacts > 0 || tenant._count.events > 0 || tenant._count.registrations > 0) {
    throw new Error("Expected wiped operational data");
  }
  if (tenant._count.tiers < 1 || tenant._count.tenantAdmins < 1) {
    throw new Error("Expected preserved tiers and TenantAdmin");
  }
  console.log("3. Tiers + TenantAdmin preserved");

  const marker = `tpw-qa-${Date.now()}`;
  const eventSlug = `${marker}-event`;
  const email = `${marker}@example.com`;
  const startsAt = new Date(Date.now() + 7 * 86_400_000);

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        tenantId: tenant.id,
        title: `TPW QA ${marker}`,
        slug: eventSlug,
        description: "Automated post-reset QA event",
        startsAt,
        location: "Online",
        status: "PUBLISHED",
        priceCents: 0,
      },
    });
    await tx.eventTicketType.create({
      data: {
        tenantId: tenant.id,
        eventId: created.id,
        name: "General admission",
        priceCents: 0,
        active: true,
        sortOrder: 0,
      },
    });
    return created;
  });

  console.log("4. Published test event:", event.slug);

  const reg = await registerPublicEvent({
    tenantSlug: SLUG,
    eventSlug,
    ticketTypeId: "",
    quantity: 1,
    firstName: "TPW",
    lastName: "QA",
    email,
    phone: "",
  });

  if (!reg.ok || !reg.registration) {
    throw new Error(reg.ok ? "Registration missing" : reg.error ?? "Registration failed");
  }

  const contact = await prisma.contact.findFirst({
    where: { tenantId: tenant.id, email },
  });
  const registration = await prisma.eventRegistration.findUnique({
    where: { id: reg.registration.id },
  });

  console.log("5. Public registration:", registration?.status, "contact:", contact?.email);
  if (!contact || !registration) {
    throw new Error("Contact or registration not found after public register");
  }

  console.log("TPW production loop: PASS");
  console.log(`Portal: /portal/${SLUG}/register/${eventSlug}`);
  console.log(`Test email: ${email}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
