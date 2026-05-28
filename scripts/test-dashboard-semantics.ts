import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { capturePublicLead, registerPublicEvent } from "@/lib/actions/public-portal";
import { getTenantDashboardSummary } from "@/lib/dashboard/tenant-summary";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getClerkOrgCount() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) return null;
  const response = await fetch("https://api.clerk.com/v1/organizations?limit=100", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return Array.isArray(payload) ? payload.length : Array.isArray(payload.data) ? payload.data.length : 0;
}

async function main() {
  const marker = `dash-semantics-${Date.now().toString(36)}`;
  const purpleSlug = `${marker}-purple`;
  const namasteSlug = `${marker}-namaste`;
  const clerkBefore = await getClerkOrgCount();

  const tenantPurple = await prisma.tenant.create({
    data: {
      slug: purpleSlug,
      name: `Purple ${marker}`,
      clerkOrgId: `dev_${marker}_purple`,
      status: "ACTIVE",
    },
  });

  const tenantNamaste = await prisma.tenant.create({
    data: {
      slug: namasteSlug,
      name: `Namaste ${marker}`,
      clerkOrgId: `dev_${marker}_namaste`,
      status: "ACTIVE",
    },
  });

  const purpleEventSlug = `${marker}-pw-event`;
  const namasteEventSlug = `${marker}-nb-event`;

  await prisma.event.createMany({
    data: [
      {
        tenantId: tenantPurple.id,
        title: "Purple class",
        slug: purpleEventSlug,
        startsAt: new Date("2035-01-01T10:00:00.000Z"),
        status: "PUBLISHED",
        capacity: 10,
        priceCents: 0,
      },
      {
        tenantId: tenantNamaste.id,
        title: "Namaste class",
        slug: namasteEventSlug,
        startsAt: new Date("2035-01-02T10:00:00.000Z"),
        status: "PUBLISHED",
        capacity: 10,
        priceCents: 0,
      },
    ],
  });

  const regPurple = await registerPublicEvent({
    tenantSlug: purpleSlug,
    eventSlug: purpleEventSlug,
    firstName: "Purple",
    lastName: "Visitor",
    email: `${marker}-pw@example.com`,
  });
  assert(regPurple.ok, "Purple registration should succeed");

  const leadNamaste = await capturePublicLead({
    tenantSlug: namasteSlug,
    firstName: "Namaste",
    lastName: "Lead",
    email: `${marker}-nb@example.com`,
    interestType: "INVESTMENT_ANALYSIS",
    source: "test_dashboard_semantics",
  });
  assert(leadNamaste.ok, "Namaste lead capture should succeed");

  const summaryPurple = await getTenantDashboardSummary(tenantPurple.id);
  const summaryNamaste = await getTenantDashboardSummary(tenantNamaste.id);

  assert(summaryPurple.contactsTotal === 1, "Purple should have 1 contact");
  assert(summaryPurple.eventRegistrationsConfirmed === 1, "Purple should have 1 confirmed registration");
  assert(summaryPurple.formalMemberships === 0, "Purple formal memberships should be 0");
  assert(summaryPurple.contactsRegistrantType === 1, "Purple registrant should be typed REGISTRANT");

  assert(summaryNamaste.contactsTotal === 1, "Namaste should have 1 contact");
  assert(summaryNamaste.contactsLeads === 1, "Namaste lead should count as lead/inquiry");
  assert(summaryNamaste.eventRegistrationsConfirmed === 0, "Namaste should have 0 registrations");
  assert(summaryNamaste.formalMemberships === 0, "Namaste formal memberships should be 0");

  const crossLeak = await prisma.contact.count({
    where: { tenantId: tenantPurple.id, email: `${marker}-nb@example.com` },
  });
  assert(crossLeak === 0, "Namaste lead must not appear under Purple tenant");

  if (clerkBefore !== null) {
    const clerkAfter = await getClerkOrgCount();
    assert(clerkAfter === clerkBefore, "Public capture must not create Clerk orgs");
  }

  console.log("Dashboard semantics checks passed:");
  console.log(`- purple contacts=${summaryPurple.contactsTotal} registrations=${summaryPurple.eventRegistrationsConfirmed}`);
  console.log(`- namaste contacts=${summaryNamaste.contactsTotal} leads=${summaryNamaste.contactsLeads}`);
  console.log("- formal memberships remain 0 until enrollment is implemented");

  await prisma.eventRegistration.deleteMany({
    where: { tenantId: { in: [tenantPurple.id, tenantNamaste.id] } },
  });
  await prisma.event.deleteMany({ where: { tenantId: { in: [tenantPurple.id, tenantNamaste.id] } } });
  await prisma.contact.deleteMany({ where: { tenantId: { in: [tenantPurple.id, tenantNamaste.id] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantPurple.id, tenantNamaste.id] } } });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
