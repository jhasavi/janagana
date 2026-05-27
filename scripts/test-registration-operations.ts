import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { registerPublicEvent } from "@/lib/actions/public-portal";
import { updateRegistrationStatusForTenant } from "@/lib/actions/events";

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

  const marker = `reg-ops-${Date.now().toString(36)}`;
  const tenantASlug = `${marker}-tenant-a`;
  const tenantBSlug = `${marker}-tenant-b`;
  const eventASlug = `${marker}-event-a`;
  const eventBSlug = `${marker}-event-b`;

  const clerkOrgCountBefore = await getClerkOrgCount();

  const tenantA = await prisma.tenant.create({
    data: {
      slug: tenantASlug,
      name: `Registration Ops Tenant A ${marker}`,
      clerkOrgId: `dev_reg_ops_${marker}_a`,
      status: "ACTIVE",
    },
  });

  const tenantB = await prisma.tenant.create({
    data: {
      slug: tenantBSlug,
      name: `Registration Ops Tenant B ${marker}`,
      clerkOrgId: `dev_reg_ops_${marker}_b`,
      status: "ACTIVE",
    },
  });

  const [eventA, eventB] = await Promise.all([
    prisma.event.create({
      data: {
        tenantId: tenantA.id,
        title: `Registration Ops Event A ${marker}`,
        slug: eventASlug,
        startsAt: new Date("2033-01-01T10:00:00.000Z"),
        status: "PUBLISHED",
        priceCents: 0,
        capacity: 1,
      },
    }),
    prisma.event.create({
      data: {
        tenantId: tenantB.id,
        title: `Registration Ops Event B ${marker}`,
        slug: eventBSlug,
        startsAt: new Date("2033-01-02T10:00:00.000Z"),
        status: "PUBLISHED",
        priceCents: 0,
        capacity: 2,
      },
    }),
  ]);

  const firstRegistration = await registerPublicEvent({
    tenantSlug: tenantASlug,
    eventSlug: eventASlug,
    firstName: "First",
    lastName: "Registrant",
    email: `${marker}-first@example.com`,
    phone: "555-0001",
  });
  assert(firstRegistration.ok, "Public registration should succeed when capacity not reached");
  assert(!firstRegistration.alreadyRegistered, "First registration should not be duplicate");

  const duplicateRegistration = await registerPublicEvent({
    tenantSlug: tenantASlug,
    eventSlug: eventASlug,
    firstName: "First",
    lastName: "Registrant",
    email: `${marker}-first@example.com`,
    phone: "555-0001",
  });
  assert(duplicateRegistration.ok, "Duplicate registration should return success response");
  assert(duplicateRegistration.alreadyRegistered, "Duplicate registration should be marked already registered");

  const registrationsAfterDuplicate = await prisma.eventRegistration.count({ where: { eventId: eventA.id } });
  assert(registrationsAfterDuplicate === 1, "Duplicate registration must not create duplicate rows");

  const fullAttempt = await registerPublicEvent({
    tenantSlug: tenantASlug,
    eventSlug: eventASlug,
    firstName: "Second",
    lastName: "Registrant",
    email: `${marker}-second@example.com`,
    phone: "555-0002",
  });
  assert(!fullAttempt.ok, "Registration should be blocked when capacity is reached");
  assert(fullAttempt.error === "This event is full.", "Capacity block should return friendly full message");

  const blockedContact = await prisma.contact.findFirst({
    where: { tenantId: tenantA.id, email: `${marker}-second@example.com` },
  });
  assert(!blockedContact, "Full event attempt must not create a Contact row");

  const tenantARegistration = await prisma.eventRegistration.findFirst({
    where: { tenantId: tenantA.id, eventId: eventA.id },
    select: { id: true },
  });
  assert(!!tenantARegistration, "Expected tenant A registration to exist");

  const cancelResult = await updateRegistrationStatusForTenant({
    tenantId: tenantA.id,
    eventId: eventA.id,
    registrationId: tenantARegistration!.id,
    nextStatus: "CANCELED",
    actorUserId: "reg-ops-admin",
  });
  assert(cancelResult.ok, "Admin should be able to cancel registration");
  assert(cancelResult.ok && cancelResult.data.status === "CANCELED", "Registration should be marked CANCELED");

  const afterCancelRegistration = await registerPublicEvent({
    tenantSlug: tenantASlug,
    eventSlug: eventASlug,
    firstName: "Second",
    lastName: "Registrant",
    email: `${marker}-second@example.com`,
    phone: "555-0002",
  });
  assert(afterCancelRegistration.ok, "Canceled registration should free capacity for new registration");
  assert(!afterCancelRegistration.alreadyRegistered, "New registrant should be inserted after capacity frees up");

  const tenantASecondRegistration = await prisma.eventRegistration.findFirst({
    where: {
      tenantId: tenantA.id,
      eventId: eventA.id,
      contact: { email: `${marker}-second@example.com` },
    },
    select: { id: true },
  });
  assert(!!tenantASecondRegistration, "Expected second tenant A registration to exist");

  const cancelSecondResult = await updateRegistrationStatusForTenant({
    tenantId: tenantA.id,
    eventId: eventA.id,
    registrationId: tenantASecondRegistration!.id,
    nextStatus: "CANCELED",
    actorUserId: "reg-ops-admin",
  });
  assert(cancelSecondResult.ok, "Admin should be able to cancel second registration");

  const confirmResult = await updateRegistrationStatusForTenant({
    tenantId: tenantA.id,
    eventId: eventA.id,
    registrationId: tenantARegistration!.id,
    nextStatus: "CONFIRMED",
    actorUserId: "reg-ops-admin",
  });
  assert(confirmResult.ok, "Admin should be able to mark a canceled registration confirmed");
  assert(confirmResult.ok && confirmResult.data.status === "CONFIRMED", "Registration should be marked CONFIRMED again");

  const tenantBRegistration = await registerPublicEvent({
    tenantSlug: tenantBSlug,
    eventSlug: eventBSlug,
    firstName: "Tenant",
    lastName: "B",
    email: `${marker}-tenant-b@example.com`,
    phone: "555-0003",
  });
  assert(tenantBRegistration.ok, "Tenant B registration setup should succeed");

  const tenantBRegId = tenantBRegistration.ok ? tenantBRegistration.registration.id : "";
  const crossTenantCancel = await updateRegistrationStatusForTenant({
    tenantId: tenantA.id,
    eventId: eventB.id,
    registrationId: tenantBRegId,
    nextStatus: "CANCELED",
    actorUserId: "reg-ops-admin",
  });
  assert(!crossTenantCancel.ok, "Tenant isolation should block cross-tenant cancel");

  const registrationAuditCount = await prisma.auditLog.count({
    where: {
      tenantId: tenantA.id,
      action: "UPDATE",
      metadata: {
        path: ["entity"],
        equals: "EventRegistration",
      },
    },
  });
  assert(registrationAuditCount >= 3, "Registration status updates must write audit logs");

  const clerkOrgCountAfter = await getClerkOrgCount();
  assert(clerkOrgCountAfter === clerkOrgCountBefore, "Public registration must not create Clerk organizations");

  console.log("Registration operation checks passed:");
  console.log("- Capacity enforcement blocks new registration when full");
  console.log("- Duplicate registration returns already registered without duplicate rows");
  console.log("- Cancel operation frees capacity for next registrant");
  console.log("- Admin can cancel and later confirm a canceled registration");
  console.log("- Cross-tenant cancel is blocked");
  console.log(`- Clerk org count unchanged: ${clerkOrgCountBefore}`);

  await prisma.eventRegistration.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.event.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.contact.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.tenantAdmin.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
