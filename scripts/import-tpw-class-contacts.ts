#!/usr/bin/env tsx
/**
 * Import TPW class roster CSV into JanaGana contacts (purple-wings tenant).
 *
 * Default CSV: ~/tpw/class1.csv
 *
 *   npm run import:tpw-class -- --dry-run
 *   npm run import:tpw-class -- --file=/path/to/class1.csv --class=class1
 *
 * Operators can also use Dashboard → Contacts → Import spreadsheet.
 */
import { config as loadEnv } from "dotenv";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { importContactsFromRows, rowsFromCsvText } from "@/lib/import/contact-roster";
import { prisma } from "@/lib/prisma";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

if (process.env.PRODUCTION_DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = process.env.PRODUCTION_DATABASE_URL.trim();
}

const DEFAULT_CSV =
  process.env.TPW_CLASS_CSV?.trim() ||
  path.join(process.cwd(), "data", "tpw-class1.csv");
const FALLBACK_CSV = path.join(process.env.TPW_ROOT ?? path.join(os.homedir(), "tpw"), "class1.csv");
const TENANT_SLUG = "purple-wings";

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    out[key] = value === undefined ? true : value;
  }
  return out;
}

async function assertContactSchemaReady() {
  try {
    await prisma.$queryRaw`SELECT "tags", "source", "interestType" FROM "Contact" LIMIT 0`;
  } catch {
    throw new Error(
      "CRM-lite Contact columns are missing on this database. Run: npx prisma db push (local dev) or npx prisma migrate deploy (production)."
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"]);
  const filePath = String(
    args.file ?? (fs.existsSync(DEFAULT_CSV) ? DEFAULT_CSV : FALLBACK_CSV),
  );
  const classTag = String(args.class ?? "class1");

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV not found: ${filePath}`);
  }

  await assertContactSchemaReady();

  const tenant = await prisma.tenant.findUnique({
    where: { slug: TENANT_SLUG },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!tenant || tenant.status !== "ACTIVE") {
    console.warn(`Skip: active tenant not found for slug "${TENANT_SLUG}" (exit 0 for deploy safety)`);
    return;
  }

  const rows = rowsFromCsvText(fs.readFileSync(filePath, "utf8"));
  console.log(`TPW class import`);
  console.log(`CSV: ${filePath}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`Class tag: ${classTag}`);
  if (dryRun) console.log("Mode: dry-run");

  const result = await importContactsFromRows({
    tenantId: tenant.id,
    actorUserId: "ops:import-tpw-class",
    rows,
    preset: "class_roster",
    importTag: classTag,
    fileLabel: path.basename(filePath),
    dryRun,
  });

  if (dryRun) {
    for (const row of result.preview) {
      console.log(`UPSERT ${row.email} — ${row.name}${row.phone ? ` (${row.phone})` : ""}`);
    }
    return;
  }

  console.log(`Created: ${result.created}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Skipped: ${result.skipped}`);
  if (result.errors.length) {
    console.log(`Errors: ${result.errors.join("; ")}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
