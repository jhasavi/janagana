import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { listPublishedPortalEvents, registerPublicEvent } from "@/lib/actions/public-portal";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function isProductionLike(host: string, database: string) {
  const signal = `${host} ${database}`;
  const prodTokens = ["prod", "production", "live", "primary"];
  const safeTokens = ["localhost", "127.0.0.1", "local", "dev", "test", "staging", "preview", "neon"];
  return prodTokens.some((token) => signal.includes(token)) && !safeTokens.some((token) => signal.includes(token));
}

function parseDatabaseUrl(raw: string | undefined) {
  if (!raw) return { host: "unknown", database: "unknown" };
  try {
    const url = new URL(raw);
    return {
      host: (url.hostname || "unknown").toLowerCase(),
      database: (url.pathname || "/").replace(/^\//, "").toLowerCase() || "unknown",
    };
  } catch {
    return { host: "unknown", database: "unknown" };
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run with NODE_ENV=production");
  }

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  if (isProductionLike(parsed.host, parsed.database)) {
    throw new Error(`Refusing production-like database target host=${parsed.host} db=${parsed.database}`);
  }

  const marker = `tenant2-${Date.now().toString(36)}`;
  const tenantPurpleSlug = `${marker}-purple`;
  const tenantNamasteSlug = `${marker}-namaste`;
  const purpleEventSlug = `${marker}-purple-event`;
  const namasteEventSlug = `${marker}-namaste-event`;

  const tenantPurple = await prisma.tenant.create({
    data: {
      name: `Purple Wings Test ${marker}`,
      slug: tenantPurpleSlug,
      clerkOrgId: `dev_${marker}_purple`,
      status: "ACTIVE",
    },
  });

  const tenantNamaste = await prisma.tenant.create({
    data: {
      name: `Namaste Boston Test ${marker}`,
      slug: tenantNamasteSlug,
      clerkOrgId: `dev_${marker}_namaste`,
      status: "ACTIVE",
    },
  });

  await prisma.event.createMany({
    data: [
      {
        tenantId: tenantPurple.id,
        title: `Purple Event ${marker}`,
        slug: purpleEventSlug,
        startsAt: new Date("2034-01-01T10:00:00.000Z"),
        status: "PUBLISHED",
        capacity: 2,
        priceCents: 0,
      },
      {
        tenantId: tenantNamaste.id,
        title: `Namaste Event ${marker}`,
        slug: namasteEventSlug,
        startsAt: new Date("2034-01-02T10:00:00.000Z"),
        status: "PUBLISHED",
        capacity: 2,
        priceCents: 0,
      },
    ],
  });

  const [purpleListing, namasteListing] = await Promise.all([
    listPublishedPortalEvents(tenantPurpleSlug),
    listPublishedPortalEvents(tenantNamasteSlug),
  ]);

  assert(purpleListing.ok, "Purple tenant listing should resolve");
  assert(namasteListing.ok, "Namaste tenant listing should resolve");
  assert(purpleListing.data.some((event) => event.slug === purpleEventSlug), "Purple portal should include purple event");
  assert(!purpleListing.data.some((event) => event.slug === namasteEventSlug), "Purple portal must not include namaste event");
  assert(namasteListing.data.some((event) => event.slug === namasteEventSlug), "Namaste portal should include namaste event");
  assert(!namasteListing.data.some((event) => event.slug === purpleEventSlug), "Namaste portal must not include purple event");

  const purpleRegistration = await registerPublicEvent({
    tenantSlug: tenantPurpleSlug,
    eventSlug: purpleEventSlug,
    firstName: "Purple",
    lastName: "Registrant",
    email: `${marker}-purple@example.com`,
    phone: "555-1000",
  });
  assert(purpleRegistration.ok, "Purple registration should succeed");

  const namasteRegistration = await registerPublicEvent({
    tenantSlug: tenantNamasteSlug,
    eventSlug: namasteEventSlug,
    firstName: "Namaste",
    lastName: "Registrant",
    email: `${marker}-namaste@example.com`,
    phone: "555-2000",
  });
  assert(namasteRegistration.ok, "Namaste registration should succeed");

  const [purpleCounts, namasteCounts] = await Promise.all([
    Promise.all([
      prisma.contact.count({ where: { tenantId: tenantPurple.id } }),
      prisma.eventRegistration.count({ where: { tenantId: tenantPurple.id } }),
    ]),
    Promise.all([
      prisma.contact.count({ where: { tenantId: tenantNamaste.id } }),
      prisma.eventRegistration.count({ where: { tenantId: tenantNamaste.id } }),
    ]),
  ]);

  assert(purpleCounts[0] === 1, "Purple tenant should have one contact");
  assert(purpleCounts[1] === 1, "Purple tenant should have one registration");
  assert(namasteCounts[0] === 1, "Namaste tenant should have one contact");
  assert(namasteCounts[1] === 1, "Namaste tenant should have one registration");

  const crossLeakPurple = await prisma.eventRegistration.count({
    where: {
      tenantId: tenantPurple.id,
      event: { slug: namasteEventSlug },
    },
  });
  const crossLeakNamaste = await prisma.eventRegistration.count({
    where: {
      tenantId: tenantNamaste.id,
      event: { slug: purpleEventSlug },
    },
  });

  assert(crossLeakPurple === 0, "Purple tenant must not contain namaste registrations");
  assert(crossLeakNamaste === 0, "Namaste tenant must not contain purple registrations");

  console.log("Second-tenant hardening checks passed:");
  console.log("- Two tenants can coexist with isolated contacts/events/registrations");
  console.log("- Purple and Namaste portal listings are isolated");
  console.log("- Registration in one tenant does not appear in the other tenant");

  await prisma.eventRegistration.deleteMany({ where: { tenantId: { in: [tenantPurple.id, tenantNamaste.id] } } });
  await prisma.event.deleteMany({ where: { tenantId: { in: [tenantPurple.id, tenantNamaste.id] } } });
  await prisma.contact.deleteMany({ where: { tenantId: { in: [tenantPurple.id, tenantNamaste.id] } } });
  await prisma.tenantAdmin.deleteMany({ where: { tenantId: { in: [tenantPurple.id, tenantNamaste.id] } } });
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
