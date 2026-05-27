#!/usr/bin/env tsx
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const CONFIRM_FLAG = "--confirm-local-setup";

function shortId(value: string): string {
  if (!value) return "";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function hasConfirmFlag(argv: string[]) {
  return argv.includes(CONFIRM_FLAG);
}

async function fetchClerkOrganizations() {
  const secret = process.env.CLERK_SECRET_KEY?.trim() ?? "";
  if (!secret) {
    throw new Error("CLERK_SECRET_KEY missing");
  }

  const response = await fetch("https://api.clerk.com/v1/organizations?limit=100", {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Clerk API failed status=${response.status} body=${body.slice(0, 150)}`);
  }

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];

  return rows.map((row: any) => ({
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    slug: row.slug ? String(row.slug) : null,
  }));
}

function findNamasteOrg(orgs: Array<{ id: string; name: string; slug: string | null }>) {
  return orgs.find((org) => org.slug === "namaste-boston")
    ?? orgs.find((org) => org.name.trim().toLowerCase() === "namaste boston");
}

async function ensureTenantForClerkOrg(clerkOrg: { id: string; name: string; slug: string | null }) {
  const existingByClerkOrg = await prisma.tenant.findUnique({
    where: { clerkOrgId: clerkOrg.id },
    select: { id: true, slug: true, name: true, clerkOrgId: true },
  });

  if (existingByClerkOrg) {
    if (existingByClerkOrg.slug !== "namaste-boston") {
      const slugOwner = await prisma.tenant.findUnique({
        where: { slug: "namaste-boston" },
        select: { id: true },
      });

      if (slugOwner && slugOwner.id !== existingByClerkOrg.id) {
        throw new Error("namaste-boston slug is already used by another tenant");
      }

      await prisma.tenant.update({
        where: { id: existingByClerkOrg.id },
        data: { slug: "namaste-boston", name: clerkOrg.name },
      });
    }

    return prisma.tenant.findUnique({
      where: { id: existingByClerkOrg.id },
      select: { id: true, name: true, slug: true, clerkOrgId: true },
    });
  }

  const existingSlug = await prisma.tenant.findUnique({
    where: { slug: "namaste-boston" },
    select: { id: true, name: true, clerkOrgId: true },
  });

  if (existingSlug && existingSlug.clerkOrgId !== clerkOrg.id) {
    throw new Error("namaste-boston slug already mapped to a different Clerk organization");
  }

  if (existingSlug) {
    return prisma.tenant.update({
      where: { id: existingSlug.id },
      data: {
        name: clerkOrg.name,
        clerkOrgId: clerkOrg.id,
      },
      select: { id: true, name: true, slug: true, clerkOrgId: true },
    });
  }

  return prisma.tenant.create({
    data: {
      name: clerkOrg.name,
      slug: "namaste-boston",
      clerkOrgId: clerkOrg.id,
      status: "ACTIVE",
    },
    select: { id: true, name: true, slug: true, clerkOrgId: true },
  });
}

async function seedNamasteData(tenantId: string) {
  await prisma.contact.upsert({
    where: {
      tenantId_email: {
        tenantId,
        email: "test.member@namaste.local",
      },
    },
    update: {
      firstName: "Test",
      lastName: "Member",
      phone: "555-0200",
      type: "MEMBER",
    },
    create: {
      tenantId,
      firstName: "Test",
      lastName: "Member",
      email: "test.member@namaste.local",
      phone: "555-0200",
      type: "MEMBER",
    },
  });

  const existingTier = await prisma.membershipTier.findFirst({
    where: {
      tenantId,
      name: "Community Member",
    },
    select: { id: true },
  });

  if (existingTier) {
    await prisma.membershipTier.update({
      where: { id: existingTier.id },
      data: {
        amountCents: 0,
        interval: "ANNUAL",
        active: true,
      },
    });
  } else {
    await prisma.membershipTier.create({
      data: {
        tenantId,
        name: "Community Member",
        amountCents: 0,
        interval: "ANNUAL",
        active: true,
      },
    });
  }

  await prisma.event.upsert({
    where: {
      tenantId_slug: {
        tenantId,
        slug: "namaste-boston-meetup",
      },
    },
    update: {
      title: "Namaste Boston Meetup",
      description: "Second-tenant hardening demo event",
      startsAt: new Date("2033-03-10T16:00:00.000Z"),
      location: "Namaste Boston Hall",
      status: "PUBLISHED",
      priceCents: 0,
      capacity: 2,
    },
    create: {
      tenantId,
      title: "Namaste Boston Meetup",
      slug: "namaste-boston-meetup",
      description: "Second-tenant hardening demo event",
      startsAt: new Date("2033-03-10T16:00:00.000Z"),
      location: "Namaste Boston Hall",
      status: "PUBLISHED",
      priceCents: 0,
      capacity: 2,
    },
  });
}

async function main() {
  if (!hasConfirmFlag(process.argv.slice(2))) {
    console.error(`Refusing setup. Re-run with ${CONFIRM_FLAG} to confirm local second-tenant setup.`);
    process.exit(1);
  }

  const orgs = await fetchClerkOrganizations();
  const namasteOrg = findNamasteOrg(orgs);

  if (!namasteOrg) {
    console.log("Namaste Boston Clerk organization was not found.");
    console.log("Use explicit owner onboarding in the app:");
    console.log("1) Sign in as owner admin");
    console.log("2) Open /onboarding/create-organization");
    console.log("3) Create organization name Namaste Boston, slug namaste-boston");
    process.exit(2);
  }

  const tenant = await ensureTenantForClerkOrg(namasteOrg);
  if (!tenant) {
    throw new Error("Failed to resolve Namaste Boston tenant after setup");
  }

  await seedNamasteData(tenant.id);

  console.log("Namaste Boston setup complete:");
  console.log(`- Clerk org: ${namasteOrg.name} (${shortId(namasteOrg.id)})`);
  console.log(`- Tenant: ${tenant.name}`);
  console.log(`- Slug: ${tenant.slug}`);
  console.log(`- TenantId: ${shortId(tenant.id)}`);
  console.log("- Seeded contact: Test Member");
  console.log("- Seeded tier: Community Member");
  console.log("- Seeded event: Namaste Boston Meetup (published, capacity 2)");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
