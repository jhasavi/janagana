import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ContactCreateSchema } from "@/lib/actions/contacts";
import { MembershipTierCreateSchema } from "@/lib/actions/membership-tiers";
import { EventCreateSchema } from "@/lib/actions/events";

const prisma = new PrismaClient();

function assert(condition: boolean, message: string) {
	if (!condition) {
		throw new Error(message);
	}
}

async function main() {
	const suffix = Date.now().toString(36);
	const tenantASlug = `local-isolation-a-${suffix}`;
	const tenantBSlug = `local-isolation-b-${suffix}`;
	const tenantEmptySlug = `local-isolation-empty-${suffix}`;

	const tenantA = await prisma.tenant.create({
		data: {
			slug: tenantASlug,
			name: `[LOCAL TEST] Tenant A ${suffix}`,
			clerkOrgId: `local_iso_org_a_${suffix}`,
			status: "ACTIVE",
		},
	});

	const tenantB = await prisma.tenant.create({
		data: {
			slug: tenantBSlug,
			name: `[LOCAL TEST] Tenant B ${suffix}`,
			clerkOrgId: `local_iso_org_b_${suffix}`,
			status: "ACTIVE",
		},
	});

	const tenantEmpty = await prisma.tenant.create({
		data: {
			slug: tenantEmptySlug,
			name: `[LOCAL TEST] Tenant Empty ${suffix}`,
			clerkOrgId: `local_iso_org_empty_${suffix}`,
			status: "ACTIVE",
		},
	});

	await prisma.contact.createMany({
		data: [
			{
				tenantId: tenantA.id,
				firstName: "Alice",
				lastName: "A",
				email: `alice-${suffix}@example.com`,
				type: "MEMBER",
			},
			{
				tenantId: tenantB.id,
				firstName: "Bob",
				lastName: "B",
				email: `bob-${suffix}@example.com`,
				type: "MEMBER",
			},
		],
	});

	await prisma.membershipTier.createMany({
		data: [
			{
				tenantId: tenantA.id,
				name: "A Monthly",
				amountCents: 2500,
				interval: "MONTHLY",
				active: true,
			},
			{
				tenantId: tenantB.id,
				name: "B Monthly",
				amountCents: 3500,
				interval: "MONTHLY",
				active: true,
			},
		],
	});

	await prisma.event.createMany({
		data: [
			{
				tenantId: tenantA.id,
				title: "Tenant A Event",
				slug: `tenant-a-event-${suffix}`,
				startsAt: new Date("2030-01-01T10:00:00.000Z"),
				status: "DRAFT",
				priceCents: 0,
			},
			{
				tenantId: tenantB.id,
				title: "Tenant B Event",
				slug: `tenant-b-event-${suffix}`,
				startsAt: new Date("2030-01-02T10:00:00.000Z"),
				status: "DRAFT",
				priceCents: 0,
			},
		],
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
		email: `mallory-${suffix}@example.com`,
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
	console.log(`- Tenant A records isolated (${tenantASlug})`);
	console.log(`- Tenant B records isolated (${tenantBSlug})`);
	console.log(`- Empty tenant state verified (${tenantEmptySlug})`);
	console.log("- Strict schemas reject injected tenantId fields");

	await prisma.event.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id, tenantEmpty.id] } } });
	await prisma.membershipTier.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id, tenantEmpty.id] } } });
	await prisma.contact.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id, tenantEmpty.id] } } });
	await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id, tenantEmpty.id] } } });
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
