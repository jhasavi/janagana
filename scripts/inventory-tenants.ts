#!/usr/bin/env tsx
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function shortId(value: string): string {
  if (!value) return "";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function fetchClerkOrganizations() {
  const secret = process.env.CLERK_SECRET_KEY?.trim() ?? "";
  if (!secret) {
    return { ok: false as const, error: "CLERK_SECRET_KEY missing", data: [] as Array<{ id: string; name: string; slug: string | null }> };
  }

  const response = await fetch("https://api.clerk.com/v1/organizations?limit=100", {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      ok: false as const,
      error: `Clerk API failed status=${response.status} body=${body.slice(0, 120)}`,
      data: [] as Array<{ id: string; name: string; slug: string | null }>,
    };
  }

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];

  const data = rows.map((row: any) => ({
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    slug: row.slug ? String(row.slug) : null,
  }));

  return { ok: true as const, error: null, data };
}

async function main() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      clerkOrgId: true,
      _count: {
        select: {
          contacts: true,
          tiers: true,
          events: true,
          registrations: true,
        },
      },
    },
  });

  console.log("DB tenant inventory:");
  if (tenants.length === 0) {
    console.log("- No tenants found");
  }

  for (const tenant of tenants) {
    console.log(`- ${tenant.name}`);
    console.log(`  slug: ${tenant.slug}`);
    console.log(`  tenantId: ${shortId(tenant.id)}`);
    console.log(`  clerkOrgId: ${shortId(tenant.clerkOrgId)}`);
    console.log(`  contacts: ${tenant._count.contacts}`);
    console.log(`  tiers: ${tenant._count.tiers}`);
    console.log(`  events: ${tenant._count.events}`);
    console.log(`  registrations: ${tenant._count.registrations}`);
  }

  console.log("");
  const clerkOrgs = await fetchClerkOrganizations();
  if (!clerkOrgs.ok) {
    console.log("Clerk organization inventory:");
    console.log(`- unavailable: ${clerkOrgs.error}`);
    return;
  }

  console.log("Clerk organization inventory:");
  console.log(`- count: ${clerkOrgs.data.length}`);
  for (const org of clerkOrgs.data.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))) {
    console.log(`- ${org.name}`);
    console.log(`  orgId: ${shortId(org.id)}`);
    console.log(`  slug: ${org.slug ?? "(none)"}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
