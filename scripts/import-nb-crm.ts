#!/usr/bin/env tsx
import { config as loadEnv } from "dotenv";
import { Prisma } from "@prisma/client";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";

type Options = Record<string, string | boolean>;

const NB_ROOT = process.env.NB_ROOT ?? "/Users/sanjeevjha/nb";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

function loadNbEnvValue(key: string): string | null {
  const envPath = path.join(NB_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return null;

  let value: string | null = null;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || match[1] !== key) continue;
    value = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return value;
}

for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
  const value = loadNbEnvValue(key);
  if (value) process.env[key] = value;
}
const nbDatabaseUrl = loadNbEnvValue("DATABASE_URL");
if (nbDatabaseUrl) process.env.NB_DATABASE_URL = nbDatabaseUrl;

function parseArgs(argv: string[]): Options {
  const out: Options = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    out[key] = value === undefined ? true : value;
  }
  return out;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function splitName(fullName: string, email: string) {
  const fallback = email.split("@")[0] || "Unknown";
  const parts = (fullName || fallback).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? fallback,
    lastName: parts.slice(1).join(" ") || "Imported",
  };
}

function normalizePhone(value: unknown): string | null {
  if (!value) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function loadCrmConfig() {
  const configPath = path.join(NB_ROOT, "crm.config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing NB CRM config at ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, string>;
}

function sqlIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function isPlaceholderSupabaseUrl(value: string): boolean {
  if (!value) return true;
  try {
    return new URL(value).host.includes("placeholder.supabase.co");
  } catch {
    return true;
  }
}

async function loadRowsFromNbPostgres(
  databaseUrl: string,
  table: string,
  emailField: string,
  emailFilter: string | null,
  limit: number | null,
) {
  const parsed = new URL(databaseUrl);
  const where = emailFilter ? ` WHERE lower(${sqlIdentifier(emailField)}) = lower('${emailFilter.replace(/'/g, "''")}')` : "";
  const limitSql = limit && Number.isFinite(limit) ? ` LIMIT ${Math.max(1, Math.floor(limit))}` : "";
  const sql = `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT * FROM ${sqlIdentifier(table)}${where} ORDER BY created_at DESC NULLS LAST${limitSql}) t;`;
  const result = spawnSync(
    "psql",
    [
      "-h", parsed.hostname,
      "-p", parsed.port || "5432",
      "-U", decodeURIComponent(parsed.username),
      "-d", parsed.pathname.replace(/^\//, "") || "postgres",
      "-At",
      "-c", sql,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PGPASSWORD: decodeURIComponent(parsed.password),
        PGSSLMODE: parsed.searchParams.get("sslmode") || "require",
      },
    },
  );

  if (result.status !== 0) {
    throw new Error(`NB Postgres query failed: ${(result.stderr || result.stdout).slice(0, 400)}`);
  }

  return JSON.parse(result.stdout.trim() || "[]") as Record<string, unknown>[];
}

async function supabaseFetch(
  supabaseUrl: string,
  supabaseKey: string,
  endpoint: string,
  init: RequestInit = {},
) {
  const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    const host = new URL(supabaseUrl).host;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Supabase fetch failed for ${host}: ${message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Supabase ${response.status}: ${body.slice(0, 300)}`);
  }

  const text = await response.text().catch(() => "");
  return text.trim() ? JSON.parse(text) : null;
}

function metadataFromRow(row: Record<string, unknown>, config: Record<string, string>) {
  const excluded = new Set([
    "id",
    "full_name",
    config.email_field,
    config.phone_field,
    "created_at",
    "updated_at",
    "janagana_contact_id",
  ].filter(Boolean));

  const metadata: Record<string, unknown> = {};
  for (const key of Object.keys(row).sort()) {
    const value = row[key];
    if (excluded.has(key) || value === null || value === undefined || value === "") continue;
    metadata[key] = value;
  }
  return metadata;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const tenantSlug = String(opts.tenantSlug ?? opts["tenant-slug"] ?? "namaste-boston").trim();
  const dryRun = Boolean(opts["dry-run"]);
  const updateLocal = Boolean(opts["update-local"]);
  const limit = opts.limit ? Number(opts.limit) : null;
  const emailFilter = opts.email ? String(opts.email).trim().toLowerCase() : null;

  const config = loadCrmConfig();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    || "";
  const nbPostgresUrl = process.env.NB_DATABASE_URL?.trim() ?? "";

  const table = config.contacts_table || "clients";
  const emailField = config.email_field || "email";
  const phoneField = config.phone_field || "phone";

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!tenant || tenant.status !== "ACTIVE") {
    throw new Error(`Active JanaGana tenant not found for slug "${tenantSlug}"`);
  }

  let rows: Record<string, unknown>[];
  const canUseSupabaseRest = Boolean(supabaseUrl && supabaseKey && !isPlaceholderSupabaseUrl(supabaseUrl));
  if (canUseSupabaseRest) {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("order", "created_at.desc.nullslast");
    if (limit && Number.isFinite(limit)) params.set("limit", String(limit));
    if (emailFilter) params.set(emailField, `eq.${emailFilter}`);
    rows = await supabaseFetch(supabaseUrl, supabaseKey, `${table}?${params.toString()}`) as Record<string, unknown>[];
  } else if (nbPostgresUrl) {
    rows = await loadRowsFromNbPostgres(nbPostgresUrl, table, emailField, emailFilter, limit);
  } else {
    throw new Error("Missing usable NB Supabase REST env or NB DATABASE_URL");
  }
  const importable = (rows ?? []).filter((row) => String(row[emailField] ?? row.email ?? "").trim());

  console.log(`NB CRM rows found: ${rows?.length ?? 0}`);
  console.log(`Rows with email: ${importable.length}`);
  console.log(`Target tenant: ${tenant.name} /${tenant.slug}`);
  if (dryRun) console.log("Mode: dry-run");

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of importable) {
    const email = String(row[emailField] ?? row.email ?? "").trim().toLowerCase();
    const fullName = String(row.full_name ?? `${row.first_name ?? ""} ${row.last_name ?? ""}`).trim();
    const { firstName, lastName } = splitName(fullName, email);
    const phone = normalizePhone(row[phoneField] ?? row.phone);
    const sourceMetadata = metadataFromRow(row, config) as Prisma.JsonObject;
    const existing = await prisma.contact.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      select: { id: true },
    });

    if (dryRun) {
      console.log(`${existing ? "UPDATE" : "CREATE"} ${email} ${firstName} ${lastName}`);
      skipped += 1;
      continue;
    }

    const contact = await prisma.contact.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: {
        firstName,
        lastName,
        phone,
        source: "nb_crm_import",
        interestType: "IMPORTED_CONTACT",
        externalSource: "namaste_boston_crm",
        externalId: row.id ? String(row.id) : null,
        importedAt: new Date(),
        originalMetadata: sourceMetadata,
        lastActivityAt: new Date(),
        lastActivitySummary: existing ? "Updated from Namaste Boston CRM import" : "Imported from Namaste Boston CRM",
      },
      create: {
        tenantId: tenant.id,
        firstName,
        lastName,
        email,
        phone,
        type: "OTHER",
        source: "nb_crm_import",
        interestType: "IMPORTED_CONTACT",
        externalSource: "namaste_boston_crm",
        externalId: row.id ? String(row.id) : null,
        importedAt: new Date(),
        originalMetadata: sourceMetadata,
        lastActivityAt: new Date(),
        lastActivitySummary: "Imported from Namaste Boston CRM",
        tags: ["imported", "namaste-boston"],
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: "ops:import-nb-crm",
        action: existing ? "UPDATE" : "CREATE",
        metadata: {
          entity: "Contact",
          source: "nb_crm_import",
          nbContactId: row.id ?? null,
          contactId: contact.id,
          nbMetadata: sourceMetadata,
        },
      },
    });

    if (existing) updated += 1;
    else created += 1;

    if (updateLocal && row.id && canUseSupabaseRest) {
      const id = encodeURIComponent(String(row.id));
      await supabaseFetch(
        supabaseUrl,
        supabaseKey,
        `${table}?id=eq.${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ janagana_contact_id: contact.id }),
        },
      );
    } else if (updateLocal && row.id) {
      console.warn("Skipping --update-local because NB Supabase REST URL/key are not configured.");
    }
  }

  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
