import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const REQUIRED_FLAG = "--confirm-local-seed";

function hasConfirmFlag(argv: string[]) {
  return argv.includes(REQUIRED_FLAG);
}

async function ensureTier(tenantId: string, name: string, amountCents: number, interval: "MONTHLY" | "ANNUAL" | "ONE_TIME") {
  const existing = await prisma.membershipTier.findFirst({
    where: { tenantId, name },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await prisma.membershipTier.create({
    data: {
      tenantId,
      name,
      amountCents,
      interval,
      active: true,
    },
  });
}

async function main() {
  if (!hasConfirmFlag(process.argv.slice(2))) {
    console.error(`Refusing to seed. Re-run with ${REQUIRED_FLAG} to confirm local demo seed.`);
    process.exit(1);
  }

  const tenantA = await prisma.tenant.upsert({
    where: { slug: "local-demo-tenant-a" },
    update: {
      name: "[LOCAL DEMO] Tenant A",
      status: "ACTIVE",
      clerkOrgId: "local_demo_org_a",
    },
    create: {
      slug: "local-demo-tenant-a",
      name: "[LOCAL DEMO] Tenant A",
      status: "ACTIVE",
      clerkOrgId: "local_demo_org_a",
    },
  });

  const tenantB = await prisma.tenant.upsert({
    where: { slug: "local-demo-tenant-b" },
    update: {
      name: "[LOCAL DEMO] Tenant B",
      status: "ACTIVE",
      clerkOrgId: "local_demo_org_b",
    },
    create: {
      slug: "local-demo-tenant-b",
      name: "[LOCAL DEMO] Tenant B",
      status: "ACTIVE",
      clerkOrgId: "local_demo_org_b",
    },
  });

  await prisma.contact.upsert({
    where: { tenantId_email: { tenantId: tenantA.id, email: "demo-a-admin@example.com" } },
    update: {
      firstName: "Demo",
      lastName: "Admin A",
      type: "MEMBER",
      phone: null,
    },
    create: {
      tenantId: tenantA.id,
      firstName: "Demo",
      lastName: "Admin A",
      email: "demo-a-admin@example.com",
      type: "MEMBER",
      phone: null,
    },
  });

  await prisma.contact.upsert({
    where: { tenantId_email: { tenantId: tenantB.id, email: "demo-b-admin@example.com" } },
    update: {
      firstName: "Demo",
      lastName: "Admin B",
      type: "MEMBER",
      phone: null,
    },
    create: {
      tenantId: tenantB.id,
      firstName: "Demo",
      lastName: "Admin B",
      email: "demo-b-admin@example.com",
      type: "MEMBER",
      phone: null,
    },
  });

  await ensureTier(tenantA.id, "[LOCAL DEMO] Monthly", 1500, "MONTHLY");
  await ensureTier(tenantA.id, "[LOCAL DEMO] Annual", 15000, "ANNUAL");
  await ensureTier(tenantB.id, "[LOCAL DEMO] Monthly", 2200, "MONTHLY");

  await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: tenantA.id, slug: "local-demo-open-house-a" } },
    update: {
      title: "[LOCAL DEMO] Open House A",
      description: "Local-only seeded event for dashboard testing.",
      startsAt: new Date("2030-06-01T10:00:00.000Z"),
      location: "Community Hall A",
      status: "PUBLISHED",
      priceCents: 0,
      capacity: 50,
    },
    create: {
      tenantId: tenantA.id,
      title: "[LOCAL DEMO] Open House A",
      slug: "local-demo-open-house-a",
      description: "Local-only seeded event for dashboard testing.",
      startsAt: new Date("2030-06-01T10:00:00.000Z"),
      location: "Community Hall A",
      status: "PUBLISHED",
      priceCents: 0,
      capacity: 50,
    },
  });

  await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: tenantB.id, slug: "local-demo-workshop-b" } },
    update: {
      title: "[LOCAL DEMO] Workshop B",
      description: "Local-only seeded event for dashboard testing.",
      startsAt: new Date("2030-06-03T15:00:00.000Z"),
      location: "Community Hall B",
      status: "DRAFT",
      priceCents: 500,
      capacity: 30,
    },
    create: {
      tenantId: tenantB.id,
      title: "[LOCAL DEMO] Workshop B",
      slug: "local-demo-workshop-b",
      description: "Local-only seeded event for dashboard testing.",
      startsAt: new Date("2030-06-03T15:00:00.000Z"),
      location: "Community Hall B",
      status: "DRAFT",
      priceCents: 500,
      capacity: 30,
    },
  });

  console.log("Local demo tenants seeded (idempotent):");
  console.log("- local-demo-tenant-a");
  console.log("- local-demo-tenant-b");
  console.log("No Clerk API calls were made.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
