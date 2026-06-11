#!/usr/bin/env tsx
/**
 * Mode 1 — Clean operational data only (default).
 *
 * Deletes tenant activity: contacts, events, registrations, memberships, payments,
 * receipts, communications, audit logs, Stripe webhook markers.
 *
 * Preserves by default: Tenant row, clerkOrgId mapping, slug, TenantAdmin cache,
 * membership tiers (plans).
 *
 *   npm run pilot:reset -- --tenant=purple-wings --dry-run
 *   PRODUCTION_DATABASE_URL='…' npm run pilot:reset -- --tenant=purple-wings --confirm-pilot-reset
 *
 * Optional:
 *   --wipe-tiers          also delete membership tier definitions
 *   --drop-tenant         delete the Tenant row after data wipe (full re-onboarding)
 *   --allow-any-tenant    allow slugs outside approved pilot list (use with care)
 */
import { PrismaClient } from "@prisma/client";
import { PILOT_TENANT_SLUGS } from "@/lib/pilot/tenants";
import {
  isProductionLike,
  loadPilotEnvFiles,
  parseArgs,
  parseDatabaseUrl,
  printDatabaseTarget,
  requireDatabaseUrl,
} from "./lib/pilot-script-utils";

const prisma = new PrismaClient();

async function wipeTenantOperationalData(
  tenantId: string,
  options: { dryRun: boolean; wipeTiers: boolean },
) {
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
    stripeWebhookEvents: await prisma.stripeWebhookEvent.count({ where: { tenantId } }),
    tenantAdmins: await prisma.tenantAdmin.count({ where: { tenantId } }),
  };

  console.log("  counts:", counts);
  console.log(
    options.wipeTiers
      ? "  preserving: Tenant row, clerkOrgId, slug, TenantAdmin"
      : "  preserving: Tenant row, clerkOrgId, slug, TenantAdmin, membership tiers",
  );

  if (options.dryRun) return;

  await prisma.communicationMessage.deleteMany({ where: { tenantId } });
  await prisma.paymentReceipt.deleteMany({ where: { tenantId } });
  await prisma.paymentRecord.deleteMany({ where: { tenantId } });
  await prisma.eventRegistration.deleteMany({ where: { tenantId } });
  await prisma.eventTicketType.deleteMany({ where: { tenantId } });
  await prisma.event.deleteMany({ where: { tenantId } });
  await prisma.membership.deleteMany({ where: { tenantId } });
  if (options.wipeTiers) {
    await prisma.membershipTier.deleteMany({ where: { tenantId } });
  }
  await prisma.contact.deleteMany({ where: { tenantId } });
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.stripeWebhookEvent.deleteMany({ where: { tenantId } });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadPilotEnvFiles(Boolean(args.production) ? "production" : "default");
  const dryRun = Boolean(args["dry-run"]);
  const confirm = Boolean(args["confirm-pilot-reset"]);
  const dropTenant = Boolean(args["drop-tenant"]);
  const wipeTiers = Boolean(args["wipe-tiers"]);
  const allPilot = Boolean(args["all-pilot"]);
  const allowAnyTenant = Boolean(args["allow-any-tenant"]);
  const tenantSlug = String(args.tenant ?? "").trim();

  requireDatabaseUrl();
  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);

  if (!dryRun && !confirm) {
    throw new Error("Refusing to run without --confirm-pilot-reset (use --dry-run to preview)");
  }

  if (!dryRun && isProductionLike(parsed.host, parsed.database)) {
    console.log("");
    console.log("*** PRODUCTION DATABASE TARGET ***");
    console.log("This deletes operational data for the selected tenant(s).");
    console.log("Tenant rows and Clerk mappings are preserved unless --drop-tenant is set.");
    console.log("");
  }

  const slugs = allPilot ? [...PILOT_TENANT_SLUGS] : tenantSlug ? [tenantSlug] : [];

  if (slugs.length === 0) {
    throw new Error("Pass --tenant=purple-wings or --all-pilot");
  }

  for (const slug of slugs) {
    if (!allowAnyTenant && !(PILOT_TENANT_SLUGS as readonly string[]).includes(slug)) {
      throw new Error(
        `${slug} is not an approved pilot slug. Use --allow-any-tenant only when you intend to wipe a bootstrapped tenant.`,
      );
    }
  }

  printDatabaseTarget(`Pilot operational reset ${dryRun ? "(dry-run)" : "(APPLY)"}`);
  console.log(`Tenants: ${slugs.join(", ")}`);
  if (dropTenant) console.log("Will DROP tenant rows after operational wipe");
  if (wipeTiers) console.log("Will also delete membership tier definitions");

  for (const slug of slugs) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, clerkOrgId: true },
    });

    if (!tenant) {
      console.log(`- SKIP ${slug}: no tenant row (run pilot:seed or pilot:bootstrap first)`);
      continue;
    }

    console.log(`- ${slug} (${tenant.name}) clerkOrgId=${tenant.clerkOrgId}`);
    await wipeTenantOperationalData(tenant.id, { dryRun, wipeTiers });

    if (dropTenant && !dryRun) {
      await prisma.tenantAdmin.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
      console.log("  dropped tenant row and TenantAdmin cache");
    }
  }

  console.log(dryRun ? "Dry-run complete — no rows deleted" : "Pilot operational reset complete");
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
