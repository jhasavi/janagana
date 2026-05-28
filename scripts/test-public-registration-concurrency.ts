import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { registerPublicEvent } from "@/lib/actions/public-portal";

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

function summarizePrismaError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Unknown error";
  }

  const candidate = error as { code?: string; message?: string };
  const code = candidate.code ? `code=${candidate.code}` : "code=unknown";
  const message = candidate.message ?? "No message";
  return `${code}; message=${message}`;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run with NODE_ENV=production");
  }

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  if (isProductionLike(parsed.host, parsed.database)) {
    throw new Error(`Refusing production-like database target host=${parsed.host} db=${parsed.database}`);
  }

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
  } catch (error) {
    throw new Error(
      `Database connection preflight failed (${summarizePrismaError(error)}). Run 'npm run check:db:test' and fix DATABASE_URL permissions before retrying this concurrency test.`,
    );
  }

  const marker = `portal-capacity-${Date.now().toString(36)}`;
  const tenantSlug = `${marker}-tenant`;
  const eventSlug = `${marker}-event`;
  const capacity = 5;
  const attempts = 20;

  const tenant = await prisma.tenant.create({
    data: {
      slug: tenantSlug,
      name: `Portal Capacity ${marker}`,
      clerkOrgId: `dev_portal_capacity_${marker}`,
      status: "ACTIVE",
    },
  });

  const event = await prisma.event.create({
    data: {
      tenantId: tenant.id,
      title: `${marker} Event`,
      slug: eventSlug,
      description: "Concurrent registration capacity guard test",
      startsAt: new Date("2032-06-15T10:00:00.000Z"),
      status: "PUBLISHED",
      priceCents: 0,
      capacity,
    },
  });

  const outcomes = await Promise.all(
    Array.from({ length: attempts }).map((_, index) =>
      registerPublicEvent({
        tenantSlug,
        eventSlug,
        firstName: `Runner${index}`,
        lastName: "Concurrent",
        email: `${marker}-${index}@example.com`,
        phone: "",
      }),
    ),
  );

  const confirmedCount = await prisma.eventRegistration.count({
    where: { tenantId: tenant.id, eventId: event.id, status: "CONFIRMED" },
  });
  const totalContacts = await prisma.contact.count({ where: { tenantId: tenant.id } });

  const successCount = outcomes.filter((item) => item.ok).length;
  const fullErrors = outcomes.filter((item) => !item.ok && item.error === "This event is full.").length;
  const busyErrors = outcomes.filter((item) => !item.ok && item.error.includes("busy")).length;

  assert(confirmedCount === capacity, `Expected confirmed registrations to equal capacity (${capacity}), got ${confirmedCount}`);
  assert(totalContacts === successCount, "Each successful registration should map to exactly one contact");
  assert(fullErrors + busyErrors === attempts - successCount, "Every failed attempt should be a capacity-related failure");

  console.log("Public registration concurrency checks passed:");
  console.log(`- tenantSlug: ${tenantSlug}`);
  console.log(`- eventSlug: ${eventSlug}`);
  console.log(`- attempts: ${attempts}`);
  console.log(`- capacity: ${capacity}`);
  console.log(`- successCount: ${successCount}`);
  console.log(`- fullErrors: ${fullErrors}`);
  console.log(`- busyErrors: ${busyErrors}`);
  console.log(`- confirmedCount: ${confirmedCount}`);

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
