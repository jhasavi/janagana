/**
 * Delete ONLY QA-prefixed contact emails and related registrations.
 *
 * Usage (requires explicit confirmation flags):
 *   PRODUCTION_DATABASE_URL="..." npx tsx scripts/cleanup-qa-contacts.ts --confirm --allow-production-qa-cleanup
 *
 * Dry run + CSV export (no deletes):
 *   npx tsx scripts/cleanup-qa-contacts.ts --export-csv=qa-contacts-to-delete.csv
 */
import { config as loadEnv } from "dotenv";
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const QA_EMAIL_PATTERN = /^(qa-prod-|qa-prod-vercel-|qa-smoke-|test-production-)/i;

function parseArgs() {
  const exportCsv = process.argv.find((a) => a.startsWith("--export-csv="))?.split("=")[1];
  return {
    confirm: process.argv.includes("--confirm"),
    allowProduction: process.argv.includes("--allow-production-qa-cleanup"),
    exportCsv,
  };
}

function maskDatabaseTarget(raw: string | undefined) {
  if (!raw) return { host: "unknown", database: "unknown" };
  try {
    const url = new URL(raw);
    return {
      host: url.hostname || "unknown",
      database: (url.pathname || "/").replace(/^\//, "") || "unknown",
    };
  } catch {
    return { host: "unknown", database: "unknown" };
  }
}

function isProductionLike(host: string, database: string) {
  const signal = `${host} ${database}`.toLowerCase();
  const prod = ["prod", "production", "live", "neon.tech"];
  const safe = ["localhost", "127.0.0.1", "local", "dev", "test", "janagana_v3"];
  return prod.some((t) => signal.includes(t)) && !safe.some((t) => signal.includes(t));
}

async function main() {
  const { confirm, allowProduction, exportCsv } = parseArgs();
  const dbUrl = process.env.PRODUCTION_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error("Set PRODUCTION_DATABASE_URL or DATABASE_URL");
  }

  const target = maskDatabaseTarget(dbUrl);
  const productionLike = isProductionLike(target.host, target.database);

  console.log("QA contact cleanup");
  console.log(`- host: ${target.host}`);
  console.log(`- database: ${target.database}`);
  console.log(`- mode: ${confirm ? "DELETE" : "DRY RUN"}`);

  if (process.env.NODE_ENV === "production" && !allowProduction) {
    throw new Error("Refusing: NODE_ENV=production without --allow-production-qa-cleanup");
  }

  if (productionLike && !allowProduction) {
    throw new Error("Refusing: production-like database without --allow-production-qa-cleanup");
  }

  if (confirm && !allowProduction) {
    throw new Error("Refusing: --confirm requires --allow-production-qa-cleanup for production-like DB");
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    const candidates = await prisma.contact.findMany({
      where: {
        OR: [
          { email: { startsWith: "qa-prod-", mode: "insensitive" } },
          { email: { startsWith: "qa-prod-vercel-", mode: "insensitive" } },
          { email: { startsWith: "qa-smoke-", mode: "insensitive" } },
          { email: { startsWith: "test-production-", mode: "insensitive" } },
        ],
      },
      select: { id: true, email: true, tenantId: true, createdAt: true },
    });

    const toDelete = candidates.filter((c) => QA_EMAIL_PATTERN.test(c.email));

    console.log(`- qa contacts matched: ${toDelete.length}`);
    for (const c of toDelete) {
      console.log(`  would delete: ${c.email} (tenant ${c.tenantId})`);
    }

    if (exportCsv) {
      const header = "id,email,tenantId,createdAt\n";
      const rows = toDelete
        .map((c) =>
          [c.id, c.email, c.tenantId, c.createdAt.toISOString()]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");
      writeFileSync(exportCsv, header + rows + (rows ? "\n" : ""));
      console.log(`- exported: ${exportCsv}`);
    }

    if (!confirm) {
      console.log("\nDry run only. Re-run with --confirm --allow-production-qa-cleanup to delete.");
      return;
    }

    for (const c of toDelete) {
      await prisma.eventRegistration.deleteMany({ where: { contactId: c.id } });
      await prisma.membership.deleteMany({ where: { contactId: c.id } });
      await prisma.contact.delete({ where: { id: c.id } });
      console.log(`  deleted: ${c.email}`);
    }

    console.log("\nCleanup complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
