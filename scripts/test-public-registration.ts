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

async function getClerkOrgCount() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    throw new Error("CLERK_SECRET_KEY missing");
  }

  const response = await fetch("https://api.clerk.com/v1/organizations?limit=100", {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Clerk org fetch failed: status=${response.status} body=${body.slice(0, 200)}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload.length : Array.isArray(payload.data) ? payload.data.length : 0;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run with NODE_ENV=production");
  }

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  if (isProductionLike(parsed.host, parsed.database)) {
    throw new Error(`Refusing production-like database target host=${parsed.host} db=${parsed.database}`);
  }

  const clerkOrgCountBefore = await getClerkOrgCount();
  const marker = `portal-public-${Date.now().toString(36)}`;
  const tenantSlug = `${marker}-tenant`;
  const tenantName = `Portal Public ${marker}`;
  const eventPublishedSlug = `${marker}-published`;
  const eventDraftSlug = `${marker}-draft`;

  const tenant = await prisma.tenant.create({
    data: {
      slug: tenantSlug,
      name: tenantName,
      clerkOrgId: `dev_portal_${marker}`,
      status: "ACTIVE",
    },
  });

  await prisma.event.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: `${marker} Published Event`,
        slug: eventPublishedSlug,
        description: "Published public event for portal smoke",
        startsAt: new Date("2032-01-01T10:00:00.000Z"),
        status: "PUBLISHED",
        priceCents: 2500,
        capacity: 50,
      },
      {
        tenantId: tenant.id,
        title: `${marker} Draft Event`,
        slug: eventDraftSlug,
        description: "Draft event should not appear publicly",
        startsAt: new Date("2032-01-02T10:00:00.000Z"),
        status: "DRAFT",
        priceCents: 0,
        capacity: 25,
      },
    ],
  });

  const listing = await listPublishedPortalEvents(tenantSlug);
  assert(listing.ok, "Published portal events should resolve for tenant slug");
  assert(listing.data.some((event) => event.slug === eventPublishedSlug), "Published event must appear publicly");
  assert(!listing.data.some((event) => event.slug === eventDraftSlug), "Draft event must not appear publicly");

  const registrationResult = await registerPublicEvent({
    tenantSlug,
    eventSlug: eventPublishedSlug,
    firstName: "Portal",
    lastName: "Visitor",
    email: `${marker}@example.com`,
    phone: "555-0100",
  });
  assert(registrationResult.ok, "Public registration should succeed");
  assert(!registrationResult.alreadyRegistered, "First registration should not be marked as duplicate");
  assert(!!registrationResult.contact, "Public registration should return a contact record");
  assert(!!registrationResult.registration, "Public registration should return an event registration record");
  const contact = registrationResult.contact!;
  const eventRegistration = registrationResult.registration!;
  assert(contact.tenantId === tenant.id, "Contact must be tenant-scoped");
  assert(eventRegistration.tenantId === tenant.id, "Event registration must be tenant-scoped");

  const duplicateResult = await registerPublicEvent({
    tenantSlug,
    eventSlug: eventPublishedSlug,
    firstName: "Portal",
    lastName: "Visitor",
    email: `${marker}@example.com`,
    phone: "555-0100",
  });
  assert(duplicateResult.ok, "Duplicate registration should return success state");
  assert(duplicateResult.alreadyRegistered, "Duplicate registration should be flagged");

  const counts = await Promise.all([
    prisma.contact.count({ where: { tenantId: tenant.id } }),
    prisma.eventRegistration.count({ where: { tenantId: tenant.id } }),
  ]);
  assert(counts[0] === 1, "Only one contact should exist for the public registrant email");
  assert(counts[1] === 1, "Only one event registration should exist for the public registrant");

  const clerkOrgCountAfter = await getClerkOrgCount();
  assert(clerkOrgCountAfter === clerkOrgCountBefore, "Public registration must not create Clerk orgs");

  console.log("Public registration checks passed:");
  console.log(`- tenantSlug: ${tenantSlug}`);
  console.log(`- publishedEvent: ${eventPublishedSlug}`);
  console.log(`- draftEventHidden: ${eventDraftSlug}`);
  console.log(`- clerkOrgCountUnchanged: ${clerkOrgCountBefore}`);

  await prisma.eventRegistration.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.event.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenantAdmin.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
