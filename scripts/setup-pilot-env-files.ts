#!/usr/bin/env tsx
/**
 * Merge local env files into canonical JanaGana v3 layout.
 * Does not call Vercel. Does not print secret values.
 *
 *   npm run env:setup -- --dry-run
 *   npm run env:setup -- --apply
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseEnv } from "dotenv";
import { maskDatabaseUrl, parseArgs, parseDatabaseUrl } from "./lib/pilot-script-utils";

const ROOT = process.cwd();

const V3_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
  "CLERK_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PLAYWRIGHT_BASE_URL",
] as const;

function read(rel: string): Record<string, string> {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return {};
  return parseEnv(fs.readFileSync(full));
}

function pickFirst(...sources: Array<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of V3_KEYS) {
    for (const src of sources) {
      const v = src[key]?.trim();
      if (v && !v.includes("REPLACE_ME")) {
        out[key] = v;
        break;
      }
    }
  }
  return out;
}

function formatEnv(data: Record<string, string>, header: string) {
  const lines = [header, `# Generated ${new Date().toISOString()}`, ""];
  for (const [key, value] of Object.entries(data)) {
    if (value.includes(" ") || value.includes("#")) {
      lines.push(`${key}="${value.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function backupIfExists(rel: string, dryRun: boolean) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = `${rel}.bak.${stamp}`;
  if (dryRun) {
    console.log(`  would backup ${rel} → ${backup}`);
    return;
  }
  fs.copyFileSync(full, path.join(ROOT, backup));
  console.log(`  backed up ${rel} → ${backup}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"]);
  const apply = Boolean(args.apply);

  if (!dryRun && !apply) {
    throw new Error("Pass --dry-run to preview or --apply to write files");
  }

  const legacy = read(".env.legacy.archive");
  const local = read(".env.local");
  const devPull = read(".env.vercel.development.pull");
  const prodPull =
    read(".env.vercel.production.pull").DATABASE_URL
      ? read(".env.vercel.production.pull")
      : read(".env.production.local");
  const prodOnly = read(".env.production.only");

  const devMerged = pickFirst(local, devPull, legacy);
  if (!devMerged.NEXT_PUBLIC_APP_URL) {
    devMerged.NEXT_PUBLIC_APP_URL = "http://localhost:3020";
  }
  if (!devMerged.DATABASE_URL) {
    const fromDevPull = devPull.DATABASE_URL?.trim();
    const fromBak = read(".env.bak").DATABASE_URL?.trim();
    if (fromDevPull) devMerged.DATABASE_URL = fromDevPull;
    else if (fromBak) devMerged.DATABASE_URL = fromBak;
    else if (legacy.DATABASE_URL?.trim()) devMerged.DATABASE_URL = legacy.DATABASE_URL.trim();
  }

  const prodDb =
    prodPull.DATABASE_URL?.trim() ||
    prodOnly.DATABASE_URL?.trim() ||
    legacy.DATABASE_URL?.trim() ||
    "";

  const devDbHost = devMerged.DATABASE_URL ? parseDatabaseUrl(devMerged.DATABASE_URL).host : "";
  const prodDbHost = prodDb ? parseDatabaseUrl(prodDb).host : "";
  if (devDbHost && prodDbHost && devDbHost === prodDbHost) {
    const localDb = read(".env.bak").DATABASE_URL?.trim();
    if (localDb) {
      console.log("");
      console.log(
        `WARN: dev DATABASE_URL matched production host (${maskDatabaseUrl(devMerged.DATABASE_URL)}) — using local .env.bak instead`,
      );
      devMerged.DATABASE_URL = localDb;
    } else {
      console.log("");
      console.log("WARN: dev DATABASE_URL uses same host as production — create a separate dev Neon DB or local Postgres");
    }
  }

  const prodClerk = pickFirst(prodPull, prodOnly);
  const pilotProd: Record<string, string> = {};
  if (prodDb) pilotProd.PRODUCTION_DATABASE_URL = prodDb;
  for (const key of [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "CLERK_WEBHOOK_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ] as const) {
    const v = prodClerk[key]?.trim();
    if (v) pilotProd[key] = v;
  }

  console.log(`Setup pilot env files ${dryRun ? "(dry-run)" : "(APPLY)"}`);
  console.log("");

  const missingDev: string[] = [];
  if (!devMerged.DATABASE_URL) missingDev.push("DATABASE_URL");
  if (!devMerged.CLERK_SECRET_KEY) missingDev.push("CLERK_SECRET_KEY");
  if (!devMerged.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) missingDev.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");

  console.log(".env.local (development)");
  console.log(`  keys to write: ${Object.keys(devMerged).length}`);
  if (missingDev.length) console.log(`  MISSING after merge: ${missingDev.join(", ")}`);

  console.log(".env.pilot.prod.local (production maintenance scripts only)");
  console.log(`  keys to write: ${Object.keys(pilotProd).length}`);
  if (!pilotProd.PRODUCTION_DATABASE_URL) {
    console.log("  MISSING: PRODUCTION_DATABASE_URL — pull Vercel production env first");
  }
  if (!pilotProd.CLERK_SECRET_KEY) {
    console.log("  MISSING: live CLERK_SECRET_KEY — pull Vercel production env first");
  }

  if (fs.existsSync(path.join(ROOT, ".env")) && !fs.existsSync(path.join(ROOT, ".env.legacy.archive"))) {
    console.log("");
    console.log("Archive legacy .env (52+ monolith keys) → .env.legacy.archive");
  }

  if (dryRun) {
    console.log("");
    console.log("Dry-run complete — no files written");
    return;
  }

  backupIfExists(".env.local", false);
  backupIfExists(".env.pilot.prod.local", false);

  fs.writeFileSync(
    path.join(ROOT, ".env.local"),
    formatEnv(
      devMerged,
      "# JanaGana v3 — local development (Clerk test + dev DATABASE_URL)",
    ),
  );
  console.log("  wrote .env.local");

  if (Object.keys(pilotProd).length > 0) {
    fs.writeFileSync(
      path.join(ROOT, ".env.pilot.prod.local"),
      formatEnv(
        pilotProd,
        "# JanaGana v3 — production pilot scripts ONLY (preflight/reset/seed with --production)",
      ),
    );
    console.log("  wrote .env.pilot.prod.local");
  }

  const envPath = path.join(ROOT, ".env");
  const archivePath = path.join(ROOT, ".env.legacy.archive");
  if (fs.existsSync(envPath) && !fs.existsSync(archivePath)) {
    backupIfExists(".env", false);
    fs.renameSync(envPath, archivePath);
    console.log("  archived .env → .env.legacy.archive");
  }

  console.log("");
  console.log("Next: npm run env:inventory");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
