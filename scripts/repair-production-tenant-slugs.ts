/**
 * Production tenant slug repair (dry-run by default).
 *
 * Local (requires production DB URL — Vercel pull omits sensitive DATABASE_URL):
 *   PRODUCTION_DATABASE_URL='postgresql://…' npx tsx scripts/repair-production-tenant-slugs.ts
 *   PRODUCTION_DATABASE_URL='…' npx tsx scripts/repair-production-tenant-slugs.ts --confirm
 *
 * On Vercel runtime (after deploy + env flags):
 *   curl -H "Authorization: Bearer $TENANT_SLUG_REPAIR_TOKEN" \\
 *     'https://janagana.namasteneedham.com/api/ops/tenant-slug-repair'
 *   curl -X POST -H "Authorization: Bearer $TENANT_SLUG_REPAIR_TOKEN" \\
 *     'https://janagana.namasteneedham.com/api/ops/tenant-slug-repair?confirm=1&deleteEmpty=1'
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  applyRepairPlan,
  buildRepairPlan,
  formatInventoryForLog,
  loadTenantInventory,
} from "../lib/ops/tenant-slug-repair";

const envFile = process.env.PRODUCTION_ENV_FILE?.trim();
if (envFile) {
  loadEnv({ path: envFile });
} else {
  loadEnv({ path: ".env" });
  loadEnv({ path: ".env.local", override: true });
}

if (!process.env.PRODUCTION_DATABASE_URL?.trim() && process.env.DATABASE_URL?.trim() && envFile) {
  process.env.PRODUCTION_DATABASE_URL = process.env.DATABASE_URL.trim();
}

function parseDatabaseUrl(raw: string | undefined) {
  if (!raw) return { host: "unknown", database: "unknown" };
  try {
    const url = new URL(raw);
    return {
      host: (url.hostname || "unknown").toLowerCase(),
      database: (url.pathname || "/").replace(/^\//, "").toLowerCase() || "unknown",
    };
  } catch {
    return { host: "unknown", database: "unknown" };
  }
}

function isProductionLike(host: string, database: string) {
  const signal = `${host} ${database}`;
  const prodTokens = ["prod", "production", "live", "neon.tech"];
  const safeTokens = ["localhost", "127.0.0.1", "local", "dev", "test", "janagana_v3"];
  return prodTokens.some((t) => signal.includes(t)) && !safeTokens.some((t) => signal.includes(t));
}

function getDbUrl(): string {
  const url = process.env.PRODUCTION_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("Set PRODUCTION_DATABASE_URL (preferred) or DATABASE_URL");
  }
  if (!process.env.PRODUCTION_DATABASE_URL?.trim() && !process.env.ALLOW_DATABASE_URL_FOR_PRODUCTION_REPAIR) {
    throw new Error(
      "Refusing: use PRODUCTION_DATABASE_URL (or ALLOW_DATABASE_URL_FOR_PRODUCTION_REPAIR=1 with a production URL)",
    );
  }
  return url;
}

async function main() {
  const confirm = process.argv.includes("--confirm");
  const deleteEmpty = process.argv.includes("--delete-empty-duplicates");
  const dbUrl = getDbUrl();
  const target = parseDatabaseUrl(dbUrl);

  console.log("Production tenant slug repair (CLI)");
  console.log(`- mode: ${confirm ? "APPLY" : "DRY RUN"}`);
  console.log(`- host: ${target.host}`);
  console.log(`- database: ${target.database}`);

  if (!isProductionLike(target.host, target.database)) {
    console.warn("- WARN: database does not look production-like");
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  try {
    const inventory = await loadTenantInventory(prisma);
    console.log("\n=== Before ===");
    for (const line of formatInventoryForLog(inventory)) {
      console.log(line);
    }

    const plan = buildRepairPlan(inventory);
    console.log("\n=== Plan ===");
    if (plan.actions.length === 0) console.log("- (no actions)");
    for (const a of plan.actions) {
      console.log(`- ${a.type}`, a);
    }
    if (plan.conflicts.length) {
      console.log("\n=== Conflicts ===");
      for (const c of plan.conflicts) console.log(`- ${c}`);
      process.exitCode = 1;
      return;
    }

    const result = await applyRepairPlan(prisma, plan, {
      confirm,
      actorUserId: process.env.REPAIR_ACTOR_USER_ID?.trim() || "cli:repair-production-tenant-slugs",
      deleteEmptyDuplicates: deleteEmpty,
    });

    if (confirm) {
      console.log("\n=== Applied ===");
      for (const line of result.applied) console.log(`- ${line}`);
    }

    console.log("\n=== After ===");
    for (const line of formatInventoryForLog(result.inventoryAfter)) {
      console.log(line);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
