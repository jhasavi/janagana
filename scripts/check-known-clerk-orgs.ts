#!/usr/bin/env tsx
/**
 * scripts/check-known-clerk-orgs.ts
 *
 * Given a list of Clerk org IDs, checks whether each has a corresponding
 * DB Tenant record. Useful for diagnosing org/tenant desync.
 *
 * Usage:
 *   npm run check:clerk-orgs -- org_abc123 org_def456
 *
 * Or to check all orgs with DB tenants:
 *   npm run check:clerk-orgs
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
else if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  const orgIds = process.argv.slice(2);

  if (orgIds.length > 0) {
    console.log(`Checking ${orgIds.length} Clerk org ID(s)...\n`);

    for (const orgId of orgIds) {
      const tenant = await prisma.tenant.findUnique({
        where: { clerkOrgId: orgId },
        select: { id: true, name: true, slug: true, status: true },
      });

      if (tenant) {
        console.log(`✓ ${orgId}`);
        console.log(`    Tenant: ${tenant.name} (${tenant.slug})`);
        console.log(`    Status: ${tenant.status}`);
        console.log(`    DB ID:  ${tenant.id}`);
      } else {
        console.log(`✗ ${orgId} → NO matching Tenant in DB`);
      }
      console.log("");
    }
  } else {
    console.log("No org IDs provided. Listing all tenants:\n");
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true, clerkOrgId: true, status: true, createdAt: true },
    });

    if (tenants.length === 0) {
      console.log("  (no tenants found)");
    } else {
      for (const t of tenants) {
        console.log(`  ${t.name}`);
        console.log(`    Slug:        ${t.slug}`);
        console.log(`    Clerk Org:   ${t.clerkOrgId}`);
        console.log(`    Status:      ${t.status}`);
        console.log(`    Created:     ${t.createdAt.toISOString()}`);
        console.log("");
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
