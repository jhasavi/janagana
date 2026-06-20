#!/usr/bin/env tsx
/**
 * Point local pilot tenants at real Clerk *test* org IDs (localhost dev only).
 *
 * Set in .env.local:
 *   LOCAL_NB_CLERK_ORG_ID=org_...
 *   LOCAL_TPW_CLERK_ORG_ID=org_...
 *
 *   npm run seed:local-clerk
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { keyModeFromPrefix } from "@/lib/environment";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

const PILOT = [
  { slug: "namaste-boston", envKey: "LOCAL_NB_CLERK_ORG_ID", name: "Namaste Boston" },
  { slug: "purple-wings", envKey: "LOCAL_TPW_CLERK_ORG_ID", name: "The Purple Wings" },
] as const;

async function main() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  if (keyModeFromPrefix(pk) !== "test") {
    throw new Error("Refusing seed:local-clerk — NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be pk_test_ (localhost only).");
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required.");
  }

  let updated = 0;
  for (const row of PILOT) {
    const clerkOrgId = process.env[row.envKey]?.trim();
    if (!clerkOrgId) {
      console.warn(`SKIP ${row.slug}: ${row.envKey} not set in .env.local`);
      continue;
    }

    const tenant = await prisma.tenant.upsert({
      where: { slug: row.slug },
      update: { clerkOrgId, name: row.name, status: "ACTIVE" },
      create: { slug: row.slug, name: row.name, clerkOrgId, status: "ACTIVE" },
    });
    console.log(`OK ${row.slug} → ${clerkOrgId.slice(0, 12)}… (${tenant.id})`);
    updated += 1;
  }

  if (updated === 0) {
    throw new Error(
      "No tenants updated. Set LOCAL_NB_CLERK_ORG_ID and LOCAL_TPW_CLERK_ORG_ID in .env.local from your Clerk test dashboard."
    );
  }

  console.log("\nNext: add your dev user to those Clerk test orgs, then sign in at http://localhost:3020");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
