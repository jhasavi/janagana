#!/usr/bin/env tsx
/**
 * Import TPW class roster CSV into JanaGana contacts (purple-wings tenant).
 *
 * Default CSV: ~/tpw/class1.csv
 *
 *   npm run import:tpw-class -- --dry-run
 *   npm run import:tpw-class -- --file=/path/to/class1.csv --class=class1
 */
import { config as loadEnv } from "dotenv";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Prisma } from "@prisma/client";
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

type CsvRow = Record<string, string>;

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    out[key] = value === undefined ? true : value;
  }
  return out;
}

/** Minimal RFC-style CSV parser (handles quoted fields and embedded newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      if (char === "\r") i += 1;
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  return rows;
}

function rowsFromCsv(filePath: string): CsvRow[] {
  const matrix = parseCsv(fs.readFileSync(filePath, "utf8"));
  if (matrix.length < 2) return [];

  const headers = matrix[0].map((h) => h.trim());
  return matrix.slice(1).map((cells) => {
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    return row;
  });
}

function splitRosterName(fullName: string, email: string) {
  const fallback = email.split("@")[0] || "Unknown";
  const cleaned = fullName.trim();
  if (cleaned.includes(",")) {
    const [last, first] = cleaned.split(",").map((part) => part.trim());
    return {
      firstName: first || fallback,
      lastName: last || "Imported",
    };
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? fallback,
    lastName: parts.slice(1).join(" ") || "Imported",
  };
}

function normalizePhone(raw: string): string | null {
  const lines = raw
    .split(/\n/)
    .map((line) => line.replace(/^(Cell|Home|Work):\s*/i, "").trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return lines.join("; ").slice(0, 30);
}

function pickField(row: CsvRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value?.trim()) return value.trim();
  }
  return "";
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

  const rows = rowsFromCsv(filePath).filter((row) => pickField(row, ["Email Address", "email"]));
  console.log(`TPW class import`);
  console.log(`CSV: ${filePath}`);
  console.log(`Rows with email: ${rows.length}`);
  console.log(`Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`Class tag: ${classTag}`);
  if (dryRun) console.log("Mode: dry-run");

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const email = pickField(row, ["Email Address", "email"]).toLowerCase();
    const fullName = pickField(row, ["Name", "name"]);
    const { firstName, lastName } = splitRosterName(fullName, email);
    const phone = normalizePhone(pickField(row, ["Phone Numbers", "phone"]));
    const rosterNumber = pickField(row, ["#", "number"]);
    const metadata = {
      importSource: "tpw_class_csv",
      classTag,
      rosterNumber: rosterNumber || null,
      rawName: fullName || null,
      csvFile: path.basename(filePath),
    } satisfies Prisma.JsonObject;

    if (dryRun) {
      console.log(`UPSERT ${email} — ${firstName} ${lastName}${phone ? ` (${phone})` : ""}`);
      continue;
    }

    const existing = await prisma.contact.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      select: { id: true, tags: true },
    });

    const tags = [...new Set([...(existing?.tags ?? []), "imported", "tpw-class", classTag])];

    const contact = await prisma.contact.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: {
        firstName,
        lastName,
        phone,
        source: "tpw_class_import",
        interestType: "CLASS_INTEREST",
        externalSource: "tpw_class_csv",
        externalId: rosterNumber || null,
        importedAt: new Date(),
        originalMetadata: metadata,
        lastActivityAt: new Date(),
        lastActivitySummary: existing ? `Updated from TPW ${classTag} roster` : `Imported from TPW ${classTag} roster`,
        tags,
        notes: `TPW class roster (${classTag}). Imported ${new Date().toISOString().slice(0, 10)}.`,
      },
      create: {
        tenantId: tenant.id,
        firstName,
        lastName,
        email,
        phone,
        type: "OTHER",
        source: "tpw_class_import",
        interestType: "CLASS_INTEREST",
        externalSource: "tpw_class_csv",
        externalId: rosterNumber || null,
        importedAt: new Date(),
        originalMetadata: metadata,
        lastActivityAt: new Date(),
        lastActivitySummary: `Imported from TPW ${classTag} roster`,
        tags,
        notes: `TPW class roster (${classTag}). Imported ${new Date().toISOString().slice(0, 10)}.`,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: "ops:import-tpw-class",
        action: existing ? "UPDATE" : "CREATE",
        metadata: {
          entity: "Contact",
          source: "tpw_class_import",
          classTag,
          contactId: contact.id,
          email,
        },
      },
    });

    if (existing) updated += 1;
    else created += 1;
  }

  if (!dryRun) {
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
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
