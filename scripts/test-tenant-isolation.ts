import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { ContactCreateSchema } from "@/lib/actions/contacts";
import { MembershipTierCreateSchema } from "@/lib/actions/membership-tiers";
import { EventCreateSchema } from "@/lib/actions/events";

const prisma = new PrismaClient();
const TEST_PREFIX = "E2E_ISOLATION_";

function loadEnvironment() {
	loadEnv({ path: ".env" });
	loadEnv({ path: ".env.local", override: true });
}

type IsolationTenantKey = "A" | "B" | "EMPTY";

type IsolationTenantConfig = {
  key: IsolationTenantKey;
  slug: string;
  name: string;
  clerkOrgId: string;
};

function parseDatabaseUrl(raw: string | undefined) {
  if (!raw) {
    return { host: "unknown", database: "unknown" };
  }

  try {
    const url = new URL(raw);
    const pathname = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
    return {
      host: (url.hostname || "unknown").toLowerCase(),
      database: (pathname || "unknown").toLowerCase(),
    };
  } catch {
    return { host: "unknown", database: "unknown" };
  }
}

function isProductionLikeDatabase(host: string, database: string) {
  const productionTokens = ["prod", "production", "primary", "live"];
  const localTokens = ["localhost", "127.0.0.1", "0.0.0.0", "local"];

  const hostLooksLocal = localTokens.some((token) => host.includes(token));
  if (hostLooksLocal) {
    return false;
  }

  const hostLooksProd = productionTokens.some((token) => host.includes(token));
  const dbLooksProd = productionTokens.some((token) => database.includes(token));
  return hostLooksProd || dbLooksProd;
}

function assert(condition: boolean, message: string) {
	if (!condition) {
		throw new Error(message);
	}
}

function ensureSafeExecutionEnvironment() {
	if (process.env.NODE_ENV === "production") {
		throw new Error("Refusing to run tenant isolation test with NODE_ENV=production");
	}

	const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
	const allowOverride = process.env.ALLOW_DEV_DB_TESTS === "true";
	const looksProd = isProductionLikeDatabase(parsed.host, parsed.database);

	if (looksProd && !allowOverride) {
		throw new Error(
			`Refusing to run against production-like database host=${parsed.host} db=${parsed.database}. Set ALLOW_DEV_DB_TESTS=true only for approved non-production testing.`,
		);
	}

	console.log("Tenant isolation DB target:");
	console.log(`- host: ${parsed.host}`);
	console.log(`- database: ${parsed.database}`);
	if (allowOverride) {
		console.log("- ALLOW_DEV_DB_TESTS=true override is active");
	}
}

function tenantConfig(key: IsolationTenantKey): IsolationTenantConfig {
	const suffix = key.toLowerCase();
	return {
		key,
		slug: `${TEST_PREFIX.toLowerCase()}tenant-${suffix}`,
		name: `${TEST_PREFIX}TENANT_${key}`,
		clerkOrgId: `${TEST_PREFIX.toLowerCase()}org_${suffix}`,
	};
}

async function cleanupTestRows() {
	await prisma.event.deleteMany({
		where: {
			OR: [
				{ title: { startsWith: TEST_PREFIX } },
				{ slug: { startsWith: TEST_PREFIX.toLowerCase() } },
			],
		},
	});

	await prisma.membershipTier.deleteMany({
		where: {
			name: { startsWith: TEST_PREFIX },
		},
	});

	await prisma.contact.deleteMany({
		where: {
			OR: [
				{ firstName: { startsWith: TEST_PREFIX } },
				{ email: { contains: `${TEST_PREFIX.toLowerCase()}contact` } },
			],
		},
	});

	await prisma.tenant.deleteMany({
		where: {
			OR: [
				{ name: { startsWith: TEST_PREFIX } },
				{ slug: { startsWith: TEST_PREFIX.toLowerCase() } },
				{ clerkOrgId: { startsWith: TEST_PREFIX.toLowerCase() } },
			],
		},
	});
}

async function assertSchemaCompatibility() {
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

	if (missing.length > 0) {
		throw new Error(
			`Database schema is incompatible for test:actions. Missing columns: ${missing.join(", ")}. Run prisma migrations or prisma db push against a non-production test DB.`,
		);
	}
}

async function upsertTenant(config: IsolationTenantConfig) {
	return prisma.tenant.upsert({
		where: { slug: config.slug },
		update: {
			name: config.name,
			clerkOrgId: config.clerkOrgId,
			status: "ACTIVE",
		},
		create: {
			slug: config.slug,
			name: config.name,
			clerkOrgId: config.clerkOrgId,
			status: "ACTIVE",
		},
	});
}

async function ensureSingleTier(tenantId: string, name: string, amountCents: number) {
	const existing = await prisma.membershipTier.findFirst({
		where: { tenantId, name },
		select: { id: true },
	});

	if (existing) {
		await prisma.membershipTier.update({
			where: { id: existing.id },
			data: { amountCents, interval: "MONTHLY", active: true },
		});
		return;
	}

	await prisma.membershipTier.create({
		data: {
			tenantId,
			name,
			amountCents,
			interval: "MONTHLY",
			active: true,
		},
	});
}

async function ensureSingleContact(
	tenantId: string,
	email: string,
	firstName: string,
	lastName: string,
) {
	const existing = await prisma.contact.findFirst({
		where: { tenantId, email },
		select: { id: true },
	});

	if (existing) {
		await prisma.contact.update({
			where: { id: existing.id },
			data: {
				firstName,
				lastName,
				type: "MEMBER",
				phone: null,
			},
		});
		return;
	}

	await prisma.contact.create({
		data: {
			tenantId,
			firstName,
			lastName,
			email,
			type: "MEMBER",
			phone: null,
		},
	});
}

async function main() {
	loadEnvironment();
	ensureSafeExecutionEnvironment();
	await assertSchemaCompatibility();

	await cleanupTestRows();

	const tenantAConfig = tenantConfig("A");
	const tenantBConfig = tenantConfig("B");
	const tenantEmptyConfig = tenantConfig("EMPTY");

	const tenantA = await upsertTenant(tenantAConfig);
	const tenantB = await upsertTenant(tenantBConfig);
	const tenantEmpty = await upsertTenant(tenantEmptyConfig);

	await ensureSingleContact(
		tenantA.id,
		`${TEST_PREFIX.toLowerCase()}contact_a@example.com`,
		`${TEST_PREFIX}CONTACT_A`,
		"A",
	);

	await ensureSingleContact(
		tenantB.id,
		`${TEST_PREFIX.toLowerCase()}contact_b@example.com`,
		`${TEST_PREFIX}CONTACT_B`,
		"B",
	);

	await ensureSingleTier(tenantA.id, `${TEST_PREFIX}TIER_A`, 2500);
	await ensureSingleTier(tenantB.id, `${TEST_PREFIX}TIER_B`, 3500);

	await prisma.event.upsert({
		where: {
			tenantId_slug: {
				tenantId: tenantA.id,
				slug: `${TEST_PREFIX.toLowerCase()}event-a`,
			},
		},
		update: {
			title: `${TEST_PREFIX}EVENT_A`,
			startsAt: new Date("2030-01-01T10:00:00.000Z"),
			status: "DRAFT",
			priceCents: 0,
		},
		create: {
			tenantId: tenantA.id,
			title: `${TEST_PREFIX}EVENT_A`,
			slug: `${TEST_PREFIX.toLowerCase()}event-a`,
			startsAt: new Date("2030-01-01T10:00:00.000Z"),
			status: "DRAFT",
			priceCents: 0,
		},
	});

	await prisma.event.upsert({
		where: {
			tenantId_slug: {
				tenantId: tenantB.id,
				slug: `${TEST_PREFIX.toLowerCase()}event-b`,
			},
		},
		update: {
			title: `${TEST_PREFIX}EVENT_B`,
			startsAt: new Date("2030-01-02T10:00:00.000Z"),
			status: "DRAFT",
			priceCents: 0,
		},
		create: {
			tenantId: tenantB.id,
			title: `${TEST_PREFIX}EVENT_B`,
			slug: `${TEST_PREFIX.toLowerCase()}event-b`,
			startsAt: new Date("2030-01-02T10:00:00.000Z"),
			status: "DRAFT",
			priceCents: 0,
		},
	});

	const [contactsA, contactsB] = await Promise.all([
		prisma.contact.count({ where: { tenantId: tenantA.id } }),
		prisma.contact.count({ where: { tenantId: tenantB.id } }),
	]);
	assert(contactsA === 1, "Tenant A should have exactly 1 contact");
	assert(contactsB === 1, "Tenant B should have exactly 1 contact");

	const [tiersA, tiersB] = await Promise.all([
		prisma.membershipTier.count({ where: { tenantId: tenantA.id } }),
		prisma.membershipTier.count({ where: { tenantId: tenantB.id } }),
	]);
	assert(tiersA === 1, "Tenant A should have exactly 1 membership tier");
	assert(tiersB === 1, "Tenant B should have exactly 1 membership tier");

	const [eventsA, eventsB] = await Promise.all([
		prisma.event.count({ where: { tenantId: tenantA.id } }),
		prisma.event.count({ where: { tenantId: tenantB.id } }),
	]);
	assert(eventsA === 1, "Tenant A should have exactly 1 event");
	assert(eventsB === 1, "Tenant B should have exactly 1 event");

	const contactsVisibleToA = await prisma.contact.findMany({ where: { tenantId: tenantA.id } });
	assert(
		contactsVisibleToA.every((row) => row.tenantId === tenantA.id),
		"Tenant A contacts query should only return tenant A rows",
	);

	const rejectContactTenantId = ContactCreateSchema.safeParse({
		tenantId: tenantB.id,
		firstName: "Mallory",
		lastName: "X",
		email: `${TEST_PREFIX.toLowerCase()}mallory@example.com`,
		type: "MEMBER",
	});
	assert(!rejectContactTenantId.success, "Contact schema must reject tenantId from client payload");

	const rejectTierTenantId = MembershipTierCreateSchema.safeParse({
		tenantId: tenantB.id,
		name: "Injected Tier",
		amountCents: 100,
		interval: "MONTHLY",
		active: true,
	});
	assert(!rejectTierTenantId.success, "Tier schema must reject tenantId from client payload");

	const rejectEventTenantId = EventCreateSchema.safeParse({
		tenantId: tenantB.id,
		title: "Injected Event",
		startsAt: new Date("2030-05-05T10:00:00.000Z"),
		status: "DRAFT",
		priceCents: 0,
	});
	assert(!rejectEventTenantId.success, "Event schema must reject tenantId from client payload");

	const [emptyContacts, emptyTiers, emptyEvents] = await Promise.all([
		prisma.contact.count({ where: { tenantId: tenantEmpty.id } }),
		prisma.membershipTier.count({ where: { tenantId: tenantEmpty.id } }),
		prisma.event.count({ where: { tenantId: tenantEmpty.id } }),
	]);
	assert(emptyContacts === 0, "Empty tenant should have 0 contacts");
	assert(emptyTiers === 0, "Empty tenant should have 0 membership tiers");
	assert(emptyEvents === 0, "Empty tenant should have 0 events");

	console.log("Tenant isolation checks passed:");
	console.log(`- Tenant A records isolated (${tenantAConfig.slug})`);
	console.log(`- Tenant B records isolated (${tenantBConfig.slug})`);
	console.log(`- Empty tenant state verified (${tenantEmptyConfig.slug})`);
	console.log("- Strict schemas reject injected tenantId fields");
	console.log(
		"- Required permission: read/write/delete on Tenant, Contact, MembershipTier, Event for E2E_ISOLATION_ prefixed records",
	);

	await cleanupTestRows();
	console.log("- Cleanup complete for E2E_ISOLATION_ records");
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		try {
			await cleanupTestRows();
		} catch {
			// Best-effort cleanup for partially failed runs.
		}
		await prisma.$disconnect();
	});
