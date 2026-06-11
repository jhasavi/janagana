#!/usr/bin/env tsx
/**
 * Mode 3 — Admin-approved bootstrap for a new tenant (e.g. ICON).
 *
 * Does NOT call Clerk. Does NOT enable self-serve onboarding in the app.
 * Operator access still requires Clerk org membership for the mapped clerkOrgId.
 *
 *   npm run pilot:bootstrap -- --name="ICON" --slug=icon-needham --clerk-org-id=org_… --dry-run
 *   PRODUCTION_DATABASE_URL='…' npm run pilot:bootstrap -- --name="ICON" --slug=icon-needham --clerk-org-id=org_… --confirm-bootstrap-tenant
 *   … --admin-clerk-user-id=user_…   (optional TenantAdmin cache row)
 */
import { PrismaClient } from "@prisma/client";
import {
  isProductionLike,
  loadPilotEnvFiles,
  parseArgs,
  parseDatabaseUrl,
  printDatabaseTarget,
  requireDatabaseUrl,
} from "./lib/pilot-script-utils";

const prisma = new PrismaClient();

function isValidSlug(slug: string) {
  return /^[a-z0-9-]{2,60}$/.test(slug);
}

async function main() {
  loadPilotEnvFiles("default");
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"]);
  const confirm = Boolean(args["confirm-bootstrap-tenant"]);
  const forceUpdate = Boolean(args["force-update"]);

  const name = String(args.name ?? "").trim();
  const slug = String(args.slug ?? "").trim().toLowerCase();
  const clerkOrgId = String(args["clerk-org-id"] ?? "").trim();
  const adminClerkUserId = String(args["admin-clerk-user-id"] ?? "").trim();

  requireDatabaseUrl();
  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);

  if (!dryRun && !confirm) {
    throw new Error("Refusing to run without --confirm-bootstrap-tenant (use --dry-run to preview)");
  }

  if (name.length < 2) throw new Error("--name is required (min 2 characters)");
  if (!isValidSlug(slug)) throw new Error("--slug must match /^[a-z0-9-]{2,60}$/");
  if (!clerkOrgId) throw new Error("--clerk-org-id is required");

  printDatabaseTarget(`Bootstrap tenant ${dryRun ? "(dry-run)" : "(APPLY)"}`);
  console.log(`Tenant: ${name} / ${slug}`);
  console.log(`Clerk org: ${clerkOrgId}`);
  if (adminClerkUserId) console.log(`TenantAdmin cache: ${adminClerkUserId}`);

  const existingBySlug = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, clerkOrgId: true, status: true },
  });
  const existingByClerkOrg = await prisma.tenant.findUnique({
    where: { clerkOrgId },
    select: { id: true, name: true, slug: true, clerkOrgId: true, status: true },
  });

  if (existingBySlug && existingByClerkOrg && existingBySlug.id !== existingByClerkOrg.id) {
    throw new Error("Slug and clerkOrgId are already used by different tenant rows — resolve manually");
  }

  const existing = existingBySlug ?? existingByClerkOrg;

  if (existing) {
    const needsUpdate =
      existing.name !== name || existing.slug !== slug || existing.clerkOrgId !== clerkOrgId || existing.status !== "ACTIVE";

    console.log(`Existing tenant: id=${existing.id} slug=${existing.slug} clerkOrgId=${existing.clerkOrgId}`);
    if (!needsUpdate) {
      console.log("No tenant row changes needed.");
    } else if (!forceUpdate) {
      throw new Error("Tenant exists with different values — pass --force-update to apply or choose a new slug/clerkOrgId");
    } else if (dryRun) {
      console.log("Dry-run: would update tenant row");
    } else {
      await prisma.tenant.update({
        where: { id: existing.id },
        data: { name, slug, clerkOrgId, status: "ACTIVE" },
      });
      console.log("Updated tenant row.");
    }
  } else if (dryRun) {
    console.log("Dry-run: would create tenant row");
  } else {
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        clerkOrgId,
        status: "ACTIVE",
        ...(adminClerkUserId
          ? {
              tenantAdmins: {
                create: { clerkUserId: adminClerkUserId, role: "owner" },
              },
            }
          : {}),
      },
      select: { id: true, slug: true, clerkOrgId: true },
    });
    console.log(`Created tenant id=${tenant.id}`);
  }

  if (adminClerkUserId && existing && !dryRun) {
    await prisma.tenantAdmin.upsert({
      where: {
        tenantId_clerkUserId: {
          tenantId: existing.id,
          clerkUserId: adminClerkUserId,
        },
      },
      create: {
        tenantId: existing.id,
        clerkUserId: adminClerkUserId,
        role: "owner",
      },
      update: { role: "owner" },
    });
    console.log("Upserted TenantAdmin cache row.");
  }

  if (isProductionLike(parsed.host, parsed.database)) {
    console.log("");
    console.log("Next steps:");
    console.log("1. Add the bootstrap admin as owner/admin in Clerk for this organization.");
    console.log("2. Sign in to JanaGana — dashboard access uses Clerk membership ∩ tenant.clerkOrgId.");
    console.log("3. Self-serve onboarding remains disabled unless ENABLE_SELF_SERVE_ONBOARDING=true.");
  }

  console.log(dryRun ? "Dry-run complete — no rows written" : "Bootstrap complete");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
