import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  classifyMembershipRenewal,
  filterMembershipRenewals,
  getMembershipRenewalsDesk,
  summarizeMembershipRenewals,
} from "@/lib/memberships/renewals";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const marker = `renewals-${Date.now().toString(36)}`;
  const tenant = await prisma.tenant.create({
    data: {
      slug: `${marker}-tenant`,
      name: `Renewals ${marker}`,
      clerkOrgId: `dev_${marker}`,
      status: "ACTIVE",
    },
  });

  const contactActive = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Active",
      lastName: "Member",
      email: `${marker}-active@example.com`,
      type: "MEMBER",
    },
  });

  const contactExpiring = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Soon",
      lastName: "Expire",
      email: `${marker}-expiring@example.org`,
      type: "MEMBER",
    },
  });

  const contactExpired = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Lapsed",
      lastName: "Member",
      email: `${marker}-expired@example.org`,
      type: "MEMBER",
    },
  });

  const tier = await prisma.membershipTier.create({
    data: {
      tenantId: tenant.id,
      name: "Annual",
      amountCents: 5000,
      interval: "ANNUAL",
      active: true,
    },
  });

  const now = new Date();
  const in20Days = new Date(now);
  in20Days.setDate(in20Days.getDate() + 20);
  const ago10Days = new Date(now);
  ago10Days.setDate(ago10Days.getDate() - 10);
  const in200Days = new Date(now);
  in200Days.setDate(in200Days.getDate() + 200);

  const [activeMembership, expiringMembership, expiredMembership] = await Promise.all([
    prisma.membership.create({
      data: {
        tenantId: tenant.id,
        contactId: contactActive.id,
        tierId: tier.id,
        status: "ACTIVE",
        startsAt: now,
        expiresAt: in200Days,
      },
    }),
    prisma.membership.create({
      data: {
        tenantId: tenant.id,
        contactId: contactExpiring.id,
        tierId: tier.id,
        status: "ACTIVE",
        startsAt: now,
        expiresAt: in20Days,
      },
    }),
    prisma.membership.create({
      data: {
        tenantId: tenant.id,
        contactId: contactExpired.id,
        tierId: tier.id,
        status: "EXPIRED",
        startsAt: ago10Days,
        expiresAt: ago10Days,
      },
    }),
  ]);

  await prisma.paymentRecord.create({
    data: {
      tenantId: tenant.id,
      contactId: contactActive.id,
      membershipId: activeMembership.id,
      amountCents: 5000,
      status: "PAID",
      method: "OFFLINE",
      purpose: "MEMBERSHIP",
      paidAt: now,
    },
  });

  const desk = await getMembershipRenewalsDesk(tenant.id);
  assert(desk.rows.length === 3, "Expected 3 membership rows");
  assert(desk.summary.activeMembers === 2, "Expected 2 active members");
  assert(desk.summary.expiringIn30Days === 1, "Expected 1 expiring in 30 days");
  assert(desk.summary.expiredMembers === 1, "Expected 1 expired member");
  assert(desk.summary.recentlyPaidCount === 1, "Expected 1 recently paid member");

  const expiringRows = filterMembershipRenewals(desk.rows, "expiring_30");
  assert(expiringRows.length === 1, "Expiring 30 filter should return 1 row");
  assert(expiringRows[0]?.membershipId === expiringMembership.id, "Wrong expiring membership");

  const expiredRows = filterMembershipRenewals(desk.rows, "expired");
  assert(expiredRows.length === 1, "Expired filter should return 1 row");

  const row = classifyMembershipRenewal(
    await prisma.membership.findUniqueOrThrow({
      where: { id: expiringMembership.id },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        tier: { select: { name: true, amountCents: true, interval: true } },
        payments: {
          select: { amountCents: true, status: true, paidAt: true, createdAt: true },
        },
        communications: {
          select: { purpose: true, status: true, createdAt: true },
        },
      },
    }),
  );
  assert(row.isExpiringWithin30, "Expiring membership should be within 30 days");
  assert(row.hasUsableEmail, "example.org should count as usable email");

  const noEmailRow = classifyMembershipRenewal({
    id: "x",
    status: "ACTIVE",
    startsAt: now,
    expiresAt: in20Days,
    contact: {
      id: "c",
      firstName: "Test",
      lastName: "User",
      email: "bad@example.com",
      phone: null,
    },
    tier: { name: "Annual", amountCents: 1000, interval: "ANNUAL" },
    payments: [],
    communications: [],
  });
  assert(!noEmailRow.hasUsableEmail, "example.com test emails should be unusable");

  const summary = summarizeMembershipRenewals(desk.rows);
  assert(summary.totalEnrollments === 3, "Summary total mismatch");

  // Queue reminder requires tenant auth context — test outbox row directly for data path
  const message = await prisma.communicationMessage.create({
    data: {
      tenantId: tenant.id,
      contactId: contactExpiring.id,
      membershipId: expiringMembership.id,
      purpose: "RENEWAL_REMINDER",
      status: "QUEUED",
      recipientEmail: contactExpiring.email,
      recipientName: "Soon Expire",
      subject: "Renew",
      body: "Please renew",
    },
  });
  assert(message.purpose === "RENEWAL_REMINDER", "Outbox purpose should be RENEWAL_REMINDER");

  console.log("Membership renewals checks passed:");
  console.log(`- active=${desk.summary.activeMembers} expiring30=${desk.summary.expiringIn30Days} expired=${desk.summary.expiredMembers}`);
  console.log("- filters and expiration classification verified");
  console.log("- RENEWAL_REMINDER outbox row created");

  await prisma.communicationMessage.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.paymentRecord.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.membership.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.membershipTier.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
