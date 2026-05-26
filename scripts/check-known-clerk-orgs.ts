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

import * as crypto from "crypto";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

function loadEnvFiles() {
  const envPath = path.resolve(process.cwd(), ".env");
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
  }
}

function fingerprint(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function keyModeFromPrefix(key: string): "test" | "live" | "unknown" {
  if (key.startsWith("pk_test_") || key.startsWith("sk_test_")) return "test";
  if (key.startsWith("pk_live_") || key.startsWith("sk_live_")) return "live";
  return "unknown";
}

loadEnvFiles();

const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const sk = process.env.CLERK_SECRET_KEY ?? "";
const databaseUrl = process.env.DATABASE_URL ?? "";

console.log("Env status:");
console.log(`- .env: ${fs.existsSync(envPath) ? "present" : "missing"}`);
console.log(`- .env.local: ${fs.existsSync(envLocalPath) ? "present" : "missing"}`);
console.log(`- DATABASE_URL: ${databaseUrl ? `present (fp=${fingerprint(databaseUrl)})` : "missing"}`);
console.log(`- Clerk publishable: ${pk ? `present (mode=${keyModeFromPrefix(pk)}, fp=${fingerprint(pk)})` : "missing"}`);
console.log(`- Clerk secret: ${sk ? `present (mode=${keyModeFromPrefix(sk)}, fp=${fingerprint(sk)})` : "missing"}`);
console.log("");

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
