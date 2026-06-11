#!/usr/bin/env tsx
/**
 * Mode 2 — Reseed approved pilot tenant rows (NB + TPW).
 *
 * Does NOT call Clerk. Requires explicit Clerk org IDs via env or CLI flags.
 *
 *   npm run pilot:seed -- --dry-run
 *   PILOT_TPW_CLERK_ORG_ID=org_… PILOT_NB_CLERK_ORG_ID=org_… npm run pilot:seed -- --confirm-pilot-seed
 *   npm run pilot:seed -- --tenant=purple-wings --clerk-org-id=org_… --confirm-pilot-seed
 */
import { PrismaClient } from "@prisma/client";
import { PILOT_TENANTS, PILOT_TENANT_SLUGS, type PilotTenantSlug } from "@/lib/pilot/tenants";
import {
  isProductionLike,
  loadPilotEnvFiles,
  parseArgs,
  parseDatabaseUrl,
  printDatabaseTarget,
  requireDatabaseUrl,
} from "./lib/pilot-script-utils";

const prisma = new PrismaClient();

const ENV_CLERK_ORG_BY_SLUG: Record<PilotTenantSlug, string> = {
  "purple-wings": "PILOT_TPW_CLERK_ORG_ID",
  "namaste-boston": "PILOT_NB_CLERK_ORG_ID",
};

function clerkOrgIdForSlug(
  slug: PilotTenantSlug,
  args: Record<string, string | boolean>,
): string | null {
  const flagKey = `clerk-org-id-${slug}`;
  const fromFlag = String(args[flagKey] ?? "").trim();
  if (fromFlag) return fromFlag;

  const singleTenant = String(args.tenant ?? "").trim();
  const singleClerkOrgId = String(args["clerk-org-id"] ?? "").trim();
  if (singleTenant === slug && singleClerkOrgId) return singleClerkOrgId;

  const envKey = ENV_CLERK_ORG_BY_SLUG[slug];
  const fromEnv = process.env[envKey]?.trim();
  return fromEnv || null;
}

function isPlaceholderClerkOrgId(value: string) {
  return (
    value.startsWith("e2e_") ||
    value.startsWith("local_demo_") ||
    value.startsWith("placeholder_") ||
    value === "REPLACE_ME"
  );
}

async function upsertPilotTenant(input: {
  slug: PilotTenantSlug;
  name: string;
  clerkOrgId: string;
  dryRun: boolean;
  forceUpdate: boolean;
}) {
  const existingBySlug = await prisma.tenant.findUnique({
    where: { slug: input.slug },
    select: { id: true, name: true, slug: true, clerkOrgId: true, status: true },
  });

  const existingByClerkOrg = await prisma.tenant.findUnique({
    where: { clerkOrgId: input.clerkOrgId },
    select: { id: true, name: true, slug: true, clerkOrgId: true, status: true },
  });

  if (existingBySlug && existingByClerkOrg && existingBySlug.id !== existingByClerkOrg.id) {
    throw new Error(
      `${input.slug}: slug and clerkOrgId belong to different tenant rows — resolve manually before seeding`,
    );
  }

  const existing = existingBySlug ?? existingByClerkOrg;

  if (existing) {
    const needsUpdate =
      existing.slug !== input.slug ||
      existing.clerkOrgId !== input.clerkOrgId ||
      existing.name !== input.name ||
      existing.status !== "ACTIVE";

    console.log(`- ${input.slug}: exists (id=${existing.id}, clerkOrgId=${existing.clerkOrgId})`);
    if (!needsUpdate) {
      console.log("  no changes needed");
      return existing;
    }

    if (!input.forceUpdate) {
      console.log("  would update name/slug/clerkOrgId/status — pass --force-update to apply");
      return existing;
    }

    if (input.dryRun) {
      console.log("  dry-run: would update tenant row");
      return existing;
    }

    return prisma.tenant.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        slug: input.slug,
        clerkOrgId: input.clerkOrgId,
        status: "ACTIVE",
      },
      select: { id: true, name: true, slug: true, clerkOrgId: true, status: true },
    });
  }

  console.log(`- ${input.slug}: would create tenant row (clerkOrgId=${input.clerkOrgId})`);
  if (input.dryRun) return null;

  return prisma.tenant.create({
    data: {
      name: input.name,
      slug: input.slug,
      clerkOrgId: input.clerkOrgId,
      status: "ACTIVE",
    },
    select: { id: true, name: true, slug: true, clerkOrgId: true, status: true },
  });
}

async function main() {
  loadPilotEnvFiles("default");
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"]);
  const confirm = Boolean(args["confirm-pilot-seed"]);
  const forceUpdate = Boolean(args["force-update"]);
  const singleTenant = String(args.tenant ?? "").trim();

  requireDatabaseUrl();
  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);

  if (!dryRun && !confirm) {
    throw new Error("Refusing to run without --confirm-pilot-seed (use --dry-run to preview)");
  }

  const slugs: PilotTenantSlug[] = singleTenant
    ? singleTenant === "purple-wings" || singleTenant === "namaste-boston"
      ? [singleTenant]
      : (() => {
          throw new Error(`Unknown pilot tenant slug: ${singleTenant}`);
        })()
    : [...PILOT_TENANT_SLUGS];

  printDatabaseTarget(`Pilot tenant seed ${dryRun ? "(dry-run)" : "(APPLY)"}`);
  console.log(`Tenants: ${slugs.join(", ")}`);

  const productionLike = isProductionLike(parsed.host, parsed.database);
  const missingIds: string[] = [];

  for (const slug of slugs) {
    const clerkOrgId = clerkOrgIdForSlug(slug, args);
    if (!clerkOrgId) {
      missingIds.push(`${slug} (set ${ENV_CLERK_ORG_BY_SLUG[slug]} or --clerk-org-id-${slug}=org_…)`);
      continue;
    }
    if (productionLike && isPlaceholderClerkOrgId(clerkOrgId)) {
      throw new Error(
        `${slug}: refusing placeholder clerk org id in production-like database (${clerkOrgId})`,
      );
    }
  }

  if (missingIds.length > 0) {
    throw new Error(
      `Missing Clerk org IDs for: ${missingIds.join("; ")}. Seed will not invent mappings silently.`,
    );
  }

  for (const slug of slugs) {
    const config = PILOT_TENANTS[slug];
    const clerkOrgId = clerkOrgIdForSlug(slug, args)!;
    await upsertPilotTenant({
      slug,
      name: config.name,
      clerkOrgId,
      dryRun,
      forceUpdate,
    });
  }

  console.log(dryRun ? "Dry-run complete — no rows written" : "Pilot seed complete");
  console.log("Clerk memberships are unchanged. Users need org membership in Clerk to access the dashboard.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
