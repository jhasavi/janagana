#!/usr/bin/env tsx
/**
 * Reset operational data for pilot tenant(s). Does not call Clerk.
 *
 *   npm run pilot:reset -- --tenant=purple-wings --dry-run
 *   PRODUCTION_DATABASE_URL='…' npm run pilot:reset -- --tenant=purple-wings --confirm-pilot-reset
 *   PRODUCTION_DATABASE_URL='…' npm run pilot:reset -- --all-pilot --confirm-pilot-reset --drop-tenant
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PILOT_TENANT_SLUGS } from "@/lib/pilot/tenants";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

if (process.env.PRODUCTION_DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = process.env.PRODUCTION_DATABASE_URL.trim();
}

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    out[key] = value === undefined ? true : value;
  }
  return out;
}

function parseDatabaseUrl(raw: string | undefined) {
  if (!raw) return { host: "unknown", database: "unknown" };
  try {
    const u = new URL(raw);
    return {
      host: (u.hostname || "unknown").toLowerCase(),
      database: (u.pathname || "/").replace(/^\//, "").toLowerCase() || "unknown",
    };
  } catch {
    return { host: "unknown", database: "unknown" };
  }
}

function isProductionLike(host: string, database: string) {
  const signal = `${host} ${database}`;
  const prodTokens = ["prod", "production", "live", "neon.tech"];
  const safeTokens = ["localhost", "127.0.0.1", "local", "dev", "test"];
  const hasProd = prodTokens.some((t) => signal.includes(t));
  const hasSafe = safeTokens.some((t) => signal.includes(t));
  return hasProd || (!hasSafe && host !== "unknown");
}

async function wipeTenantData(tenantId: string, dryRun: boolean) {
  const counts = {
    communications: await prisma.communicationMessage.count({ where: { tenantId } }),
    receipts: await prisma.paymentReceipt.count({ where: { tenantId } }),
    payments: await prisma.paymentRecord.count({ where: { tenantId } }),
    registrations: await prisma.eventRegistration.count({ where: { tenantId } }),
    ticketTypes: await prisma.eventTicketType.count({ where: { tenantId } }),
    events: await prisma.event.count({ where: { tenantId } }),
    memberships: await prisma.membership.count({ where: { tenantId } }),
    tiers: await prisma.membershipTier.count({ where: { tenantId } }),
    contacts: await prisma.contact.count({ where: { tenantId } }),
    auditLogs: await prisma.auditLog.count({ where: { tenantId } }),
    tenantAdmins: await prisma.tenantAdmin.count({ where: { tenantId } }),
  };

  console.log("  counts:", counts);

  if (dryRun) return;

  await prisma.communicationMessage.deleteMany({ where: { tenantId } });
  await prisma.paymentReceipt.deleteMany({ where: { tenantId } });
  await prisma.paymentRecord.deleteMany({ where: { tenantId } });
  await prisma.eventRegistration.deleteMany({ where: { tenantId } });
  await prisma.eventTicketType.deleteMany({ where: { tenantId } });
  await prisma.event.deleteMany({ where: { tenantId } });
  await prisma.membership.deleteMany({ where: { tenantId } });
  await prisma.membershipTier.deleteMany({ where: { tenantId } });
  await prisma.contact.deleteMany({ where: { tenantId } });
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.tenantAdmin.deleteMany({ where: { tenantId } });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"]);
  const confirm = Boolean(args["confirm-pilot-reset"]);
  const dropTenant = Boolean(args["drop-tenant"]);
  const allPilot = Boolean(args["all-pilot"]);
  const tenantSlug = String(args.tenant ?? "").trim();

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("Set PRODUCTION_DATABASE_URL or DATABASE_URL");
  }

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  if (!dryRun && !confirm) {
    throw new Error("Refusing to run without --confirm-pilot-reset (use --dry-run to preview)");
  }

  if (!dryRun && !isProductionLike(parsed.host, parsed.database)) {
    console.warn(`WARN: target does not look like production (host=${parsed.host}). Proceeding because --confirm-pilot-reset was set.`);
  }

  const slugs = allPilot
    ? [...PILOT_TENANT_SLUGS]
    : tenantSlug
      ? [tenantSlug]
      : [];

  if (slugs.length === 0) {
    throw new Error("Pass --tenant=purple-wings or --all-pilot");
  }

  console.log(`Pilot data reset ${dryRun ? "(dry-run)" : "(APPLY)"}`);
  console.log(`Database: ${parsed.host} / ${parsed.database}`);
  console.log(`Tenants: ${slugs.join(", ")}`);
  if (dropTenant) console.log("Will DROP tenant rows after data wipe");

  for (const slug of slugs) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, clerkOrgId: true },
    });

    if (!tenant) {
      console.log(`- SKIP ${slug}: no tenant row`);
      continue;
    }

    console.log(`- ${slug} (${tenant.name}) clerkOrgId=${tenant.clerkOrgId}`);
    await wipeTenantData(tenant.id, dryRun);

    if (dropTenant && !dryRun) {
      await prisma.tenant.delete({ where: { id: tenant.id } });
      console.log(`  dropped tenant row`);
    }
  }

  console.log(dryRun ? "Dry-run complete — no rows deleted" : "Pilot reset complete");
  console.log("Clerk orgs/users were NOT modified. See docs/12-PILOT-RESET.md");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
