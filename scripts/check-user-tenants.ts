#!/usr/bin/env tsx
/**
 * scripts/check-user-tenants.ts
 *
 * Diagnoses "I should see multiple tenants but only see one" for a given user.
 *
 * Tenant visibility in this app is driven entirely by Clerk organization
 * membership (see lib/tenant/tenant-resolver.ts → findMappedTenantsForUser):
 *   1. Look up every Clerk org the user is a member of.
 *   2. Match each org's Clerk org ID against Tenant.clerkOrgId.
 *   3. Only tenants with status ACTIVE are shown.
 *
 * This script walks that exact path for one email address so you can see
 * precisely where the chain breaks — the user isn't in the org, the org has
 * no matching Tenant row, or the Tenant row isn't ACTIVE.
 *
 * Usage:
 *   npm run check:user-tenants -- munujha@gmail.com
 */

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function shortId(value: string | null | undefined): string {
  if (!value) return "(none)";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function clerkFetch(path: string) {
  const secret = process.env.CLERK_SECRET_KEY?.trim() ?? "";
  if (!secret) {
    throw new Error("CLERK_SECRET_KEY missing from .env / .env.local");
  }
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Clerk API ${path} failed: status=${response.status} body=${body.slice(0, 300)}`);
  }
  return response.json();
}

async function findClerkUserByEmail(email: string) {
  const payload = await clerkFetch(`/users?email_address[]=${encodeURIComponent(email)}`);
  const rows = Array.isArray(payload) ? payload : [];
  return rows[0] ?? null;
}

async function listOrgMembershipsForUser(clerkUserId: string) {
  const payload = await clerkFetch(`/users/${clerkUserId}/organization_memberships?limit=100`);
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  return rows.map((row: any) => ({
    orgId: String(row.organization?.id ?? ""),
    orgName: String(row.organization?.name ?? ""),
    orgSlug: row.organization?.slug ? String(row.organization.slug) : null,
    role: String(row.role ?? ""),
  }));
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run check:user-tenants -- <email>");
    process.exitCode = 1;
    return;
  }

  console.log(`Checking tenant access for: ${email}\n`);

  const user = await findClerkUserByEmail(email);
  if (!user) {
    console.log("✗ No Clerk user found with this email address.");
    console.log("  → They may have signed up with a different email, or don't have an account yet.");
    return;
  }

  console.log(`✓ Clerk user found: ${shortId(user.id)} (${user.first_name ?? ""} ${user.last_name ?? ""})`.trim());

  const memberships = await listOrgMembershipsForUser(user.id);
  if (memberships.length === 0) {
    console.log("\n✗ This user is not a member of ANY Clerk organization.");
    console.log("  → In the Clerk Dashboard, add them to each organization they should have access to,");
    console.log("    or have them accept an invite for that org.");
    return;
  }

  console.log(`\nClerk organization memberships (${memberships.length}):`);
  for (const m of memberships) {
    console.log(`  - ${m.orgName || "(unnamed org)"}  [role: ${m.role || "unknown"}]`);
    console.log(`    orgId: ${shortId(m.orgId)}${m.orgSlug ? `  slug: ${m.orgSlug}` : ""}`);
  }

  console.log("\nCross-referencing against DB Tenant table...\n");

  let visibleCount = 0;
  for (const m of memberships) {
    const tenant = await prisma.tenant.findUnique({
      where: { clerkOrgId: m.orgId },
      select: { id: true, name: true, slug: true, status: true },
    });

    if (!tenant) {
      console.log(`✗ ${m.orgName || m.orgId} → NO matching Tenant row in the database.`);
      console.log("    → This Clerk org was never mapped to a Tenant (onboarding wasn't completed for it),");
      console.log("      or clerkOrgId on the Tenant row doesn't match this org's real ID.");
      continue;
    }

    if (tenant.status !== "ACTIVE") {
      console.log(`✗ ${tenant.name} (${tenant.slug}) → Tenant row exists but status is ${tenant.status}, not ACTIVE.`);
      console.log("    → findMappedTenantsForUser() filters to status: ACTIVE only, so this tenant is hidden.");
      continue;
    }

    console.log(`✓ ${tenant.name} (${tenant.slug}) → will appear in this user's tenant switcher.`);
    visibleCount += 1;
  }

  console.log(`\nResult: ${visibleCount} of ${memberships.length} org membership(s) resolve to a visible, active tenant.`);
  if (visibleCount <= 1) {
    console.log(
      visibleCount === 1
        ? "This matches 'I only see one tenant' — the fix is above (missing org membership, missing Tenant row, or inactive status)."
        : "This user currently has zero visible tenants and would be sent to onboarding.",
    );
  }
}

main()
  .catch((error) => {
    console.error("\nERROR:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
