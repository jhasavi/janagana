import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

type ParsedDbUrl = {
  provider: string;
  host: string;
  database: string;
  username: string;
};

const TEST_PREFIX = "E2E_ISOLATION_PREFLIGHT_";
const prisma = new PrismaClient();

function loadEnvironment() {
  loadEnv({ path: ".env" });
  loadEnv({ path: ".env.local", override: true });
}

function parseDatabaseUrl(raw: string | undefined): ParsedDbUrl {
  if (!raw) {
    return {
      provider: "unknown",
      host: "unknown",
      database: "unknown",
      username: "unknown",
    };
  }

  try {
    const url = new URL(raw);
    const pathname = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
    return {
      provider: url.protocol.replace(":", "") || "unknown",
      host: url.hostname || "unknown",
      database: pathname || "unknown",
      username: url.username || "unknown",
    };
  } catch {
    return {
      provider: "unknown",
      host: "unknown",
      database: "unknown",
      username: "unknown",
    };
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

async function checkTablesExist() {
  const expected = ["Tenant", "Contact", "MembershipTier", "Event", "AuditLog"];

  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA() AND table_name = ANY($1)',
    expected,
  );

  const present = new Set(rows.map((r) => r.table_name));
  const missing = expected.filter((table) => !present.has(table));

  return {
    expected,
    missing,
  };
}

async function checkRequiredColumns() {
  const requiredByTable: Record<string, string[]> = {
    Tenant: ["id", "slug", "name", "clerkOrgId", "status"],
    Contact: ["id", "tenantId", "firstName", "lastName", "email", "type"],
    MembershipTier: ["id", "tenantId", "name", "amountCents", "interval", "active"],
    Event: ["id", "tenantId", "title", "slug", "startsAt", "status", "priceCents"],
  };

  const tableNames = Object.keys(requiredByTable)
    .map((table) => `'${table}'`)
    .join(", ");

  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string; column_name: string }>>(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = CURRENT_SCHEMA() AND table_name IN (${tableNames})`,
  );

  const existingByTable = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = existingByTable.get(row.table_name) ?? new Set<string>();
    set.add(row.column_name);
    existingByTable.set(row.table_name, set);
  }

  const missing: string[] = [];
  for (const [table, requiredColumns] of Object.entries(requiredByTable)) {
    const existing = existingByTable.get(table) ?? new Set<string>();
    for (const column of requiredColumns) {
      if (!existing.has(column)) {
        missing.push(`${table}.${column}`);
      }
    }
  }

  return missing;
}

async function checkCrudPermissions() {
  const marker = `${TEST_PREFIX}${Date.now().toString(36)}`;
  const tenantSlug = `${marker.toLowerCase()}-tenant`;
  const tenantName = `${marker} Tenant`;
  const tenantClerkOrgId = `${marker.toLowerCase()}_org`;
  const contactEmail = `${marker.toLowerCase()}@example.com`;
  const tierName = `${marker} Tier`;
  const eventSlug = `${marker.toLowerCase()}-event`;
  const eventTitle = `${marker} Event`;

  let tenantId: string | null = null;
  let contactId: string | null = null;
  let tierId: string | null = null;
  let eventId: string | null = null;

  try {
    const tenant = await prisma.tenant.create({
      data: {
        slug: tenantSlug,
        name: tenantName,
        clerkOrgId: tenantClerkOrgId,
        status: "ACTIVE",
      },
    });
    tenantId = tenant.id;

    const contact = await prisma.contact.create({
      data: {
        tenantId,
        firstName: marker,
        lastName: "Readiness",
        email: contactEmail,
        type: "MEMBER",
      },
    });
    contactId = contact.id;

    const tier = await prisma.membershipTier.create({
      data: {
        tenantId,
        name: tierName,
        amountCents: 100,
        interval: "MONTHLY",
        active: true,
      },
    });
    tierId = tier.id;

    const event = await prisma.event.create({
      data: {
        tenantId,
        title: eventTitle,
        slug: eventSlug,
        startsAt: new Date("2031-01-01T00:00:00.000Z"),
        status: "DRAFT",
        priceCents: 0,
      },
    });
    eventId = event.id;

    await prisma.contact.update({
      where: { id: contactId },
      data: { phone: "000-000-0000" },
    });

    await prisma.membershipTier.update({
      where: { id: tierId },
      data: { amountCents: 200 },
    });

    await prisma.event.update({
      where: { id: eventId },
      data: { status: "PUBLISHED" },
    });

    return {
      ok: true,
      marker,
    };
  } finally {
    if (tenantId) {
      await prisma.event.deleteMany({ where: { tenantId } });
      await prisma.membershipTier.deleteMany({ where: { tenantId } });
      await prisma.contact.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
    } else {
      await prisma.event.deleteMany({ where: { title: { startsWith: TEST_PREFIX } } });
      await prisma.membershipTier.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
      await prisma.contact.deleteMany({ where: { firstName: { startsWith: TEST_PREFIX } } });
      await prisma.tenant.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
    }
  }
}

async function main() {
  loadEnvironment();

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  console.log("DB test readiness");
  console.log(`- provider: ${parsed.provider}`);
  console.log(`- host: ${parsed.host}`);
  console.log(`- database: ${parsed.database}`);
  console.log(`- user: ${parsed.username}`);

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    console.log("- connection: ok");
  } catch (error) {
    console.error("- connection: failed");
    console.error(`- details: ${summarizePrismaError(error)}`);
    process.exitCode = 1;
    return;
  }

  try {
    const tableCheck = await checkTablesExist();
    if (tableCheck.missing.length > 0) {
      console.error(`- table check: missing required tables: ${tableCheck.missing.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    console.log("- table check: required tables present");

    const missingColumns = await checkRequiredColumns();
    if (missingColumns.length > 0) {
      console.error(`- schema check: missing required columns: ${missingColumns.join(", ")}`);
      console.error("- remediation: run prisma migrations or prisma db push on the non-production test database");
      process.exitCode = 1;
      return;
    }
    console.log("- schema check: required columns present");
  } catch (error) {
    console.error("- table check: failed");
    console.error(`- details: ${summarizePrismaError(error)}`);
    process.exitCode = 1;
    return;
  }

  try {
    const result = await checkCrudPermissions();
    if (result.ok) {
      console.log("- CRUD permissions: create/update/delete test rows succeeded");
      console.log(`- cleanup: complete for marker ${result.marker}`);
      console.log("check:db:test PASS");
      return;
    }

    console.error("- CRUD permissions: failed");
    process.exitCode = 1;
  } catch (error) {
    console.error("- CRUD permissions: failed");
    console.error(`- details: ${summarizePrismaError(error)}`);
    console.error(
      "- required permission: read/write/delete on Tenant, Contact, MembershipTier, Event tables in the configured database",
    );
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(summarizePrismaError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
