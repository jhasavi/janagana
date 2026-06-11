#!/usr/bin/env tsx
/**
 * Suspend a single empty orphan tenant (read-verify, then status=SUSPENDED).
 *
 *   npm run orphan:suspend -- --slug=lead-capture-mpojyhb8-tenant --dry-run
 *   npm run orphan:suspend -- --slug=lead-capture-mpojyhb8-tenant --confirm-suspend-orphan
 */
import { PrismaClient } from "@prisma/client";
import {
  loadPilotEnvFiles,
  maskId,
  parseArgs,
  parseDatabaseUrl,
  resolveDatabaseUrl,
} from "./lib/pilot-script-utils";

const ORPHAN_SLUG = "lead-capture-mpojyhb8-tenant";

const prisma = new PrismaClient();

async function main() {
  loadPilotEnvFiles("production");
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"]);
  const confirm = Boolean(args["confirm-suspend-orphan"]);
  const slug = String(args.slug ?? ORPHAN_SLUG).trim();

  const url = resolveDatabaseUrl("production");
  if (!url) throw new Error("PRODUCTION_DATABASE_URL missing in .env.pilot.prod.local");
  process.env.DATABASE_URL = url;
  const db = parseDatabaseUrl(url);
  console.log(`Suspend orphan tenant ${dryRun ? "(dry-run)" : confirm ? "(APPLY)" : "(preview)"}`);
  console.log(`Database: ${db.host} / ${db.database}`);
  console.log(`Target slug: ${slug}`);

  if (!dryRun && !confirm) {
    throw new Error("Pass --dry-run or --confirm-suspend-orphan");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      clerkOrgId: true,
      _count: {
        select: {
          tenantAdmins: true,
          contacts: true,
          events: true,
          registrations: true,
          memberships: true,
          payments: true,
          receipts: true,
          communications: true,
          auditLogs: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }

  const counts = tenant._count;
  const totalRelated =
    counts.tenantAdmins +
    counts.contacts +
    counts.events +
    counts.registrations +
    counts.memberships +
    counts.payments +
    counts.receipts +
    counts.communications +
    counts.auditLogs;

  console.log(`Tenant: ${tenant.name} id=${maskId(tenant.id)} status=${tenant.status}`);
  console.log(`clerkOrgId: ${maskId(tenant.clerkOrgId)}`);
  console.log("Counts:", counts);

  if (totalRelated > 0) {
    throw new Error(`Refusing — tenant has ${totalRelated} related records`);
  }

  if (tenant.status === "SUSPENDED") {
    console.log("Already SUSPENDED — no change needed");
    return;
  }

  if (dryRun) {
    console.log("Dry-run: would set status=SUSPENDED");
    return;
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { status: "SUSPENDED" },
  });
  console.log("Suspended orphan tenant.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
