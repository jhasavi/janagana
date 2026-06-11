#!/usr/bin/env tsx
/**
 * Read-only inventory of local env files. Masked output only.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { config as loadEnv, parse as parseEnv } from "dotenv";
import {
  classifyDatabase,
  isProductionLike,
  keyModeFromPrefix,
  maskDatabaseUrl,
  maskId,
  maskSecret,
  parseDatabaseUrl,
} from "./lib/pilot-script-utils";

const ROOT = process.cwd();

const ENV_FILES = [
  ".env.example",
  ".env.local",
  ".env.pilot.prod.local",
  ".env.production.local",
  ".env.production.only",
  ".env.vercel.production.pull",
  ".env.vercel.development.pull",
  ".env.legacy.archive",
  ".env",
  ".env.bak",
] as const;

const V3_REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
  "CLERK_WEBHOOK_SECRET",
] as const;

const PILOT_MAINTENANCE = [
  "PRODUCTION_DATABASE_URL",
  "PILOT_TPW_CLERK_ORG_ID",
  "PILOT_NB_CLERK_ORG_ID",
] as const;

const OPTIONAL = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;

const PILOT_FLAGS = ["ENABLE_SELF_SERVE_ONBOARDING", "ENABLE_EXISTING_ORG_SETUP"] as const;

function fileExists(rel: string) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readEnvFile(rel: string): Record<string, string> {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return {};
  return parseEnv(fs.readFileSync(full));
}

function mergedForProfile(profile: "development" | "production-pilot") {
  if (profile === "development") {
    return { ...readEnvFile(".env.local") };
  }
  return {
    ...readEnvFile(".env.pilot.prod.local"),
  };
}

function varStatus(value: string | undefined) {
  const v = value?.trim() ?? "";
  if (!v) return { present: false, masked: "(not set)" };
  if (v.includes("REPLACE_ME") || v.includes("<")) return { present: false, masked: "(placeholder)" };
  return { present: true, masked: maskSecret(v) };
}

function readVercelMeta() {
  const repoPath = path.join(ROOT, ".vercel", "repo.json");
  const projectPath = path.join(ROOT, ".vercel", "project.json");
  if (fs.existsSync(projectPath)) {
    try {
      return JSON.parse(fs.readFileSync(projectPath, "utf8")) as Record<string, string>;
    } catch {
      return null;
    }
  }
  if (fs.existsSync(repoPath)) {
    try {
      const repo = JSON.parse(fs.readFileSync(repoPath, "utf8")) as {
        projects?: Array<{ id: string; name: string; orgId: string }>;
      };
      const p = repo.projects?.[0];
      if (p) return { projectId: p.id, projectName: p.name, orgId: p.orgId };
    } catch {
      return null;
    }
  }
  return null;
}

async function main() {
  loadEnv({ path: path.join(ROOT, ".env") });
  loadEnv({ path: path.join(ROOT, ".env.local"), override: true });

  const vercel = readVercelMeta();

  console.log("JanaGana environment inventory (read-only)");
  console.log("==========================================");
  console.log("");

  console.log("Env files on disk");
  for (const rel of ENV_FILES) {
    const exists = fileExists(rel);
    const size = exists ? fs.statSync(path.join(ROOT, rel)).size : 0;
    console.log(`  ${exists ? "✓" : "·"} ${rel}${exists ? ` (${size} bytes)` : ""}`);
  }
  console.log("");

  if (vercel) {
    console.log("Vercel link");
    console.log(`  project: ${vercel.projectName ?? vercel.projectId ?? "unknown"}`);
    console.log(`  projectId: ${maskId(String(vercel.projectId ?? ""))}`);
    console.log(`  orgId: ${maskId(String(vercel.orgId ?? ""))}`);
  } else {
    console.log("Vercel link: not found — run `vercel link` in repo root");
  }
  console.log("");

  const dev = mergedForProfile("development");
  const prodPilot = mergedForProfile("production-pilot");

  function printProfile(title: string, env: Record<string, string>) {
    console.log(title);
    for (const key of V3_REQUIRED) {
      const s = varStatus(env[key]);
      console.log(`  ${key}: ${s.present ? "present" : "MISSING"} ${s.masked}`);
    }
    for (const key of PILOT_MAINTENANCE) {
      const s = varStatus(env[key]);
      console.log(`  ${key}: ${s.present ? "present" : "optional/missing"} ${s.masked}`);
    }
    for (const key of OPTIONAL) {
      const s = varStatus(env[key]);
      console.log(`  ${key}: ${s.present ? "present" : "optional"} ${s.masked}`);
    }
    for (const key of PILOT_FLAGS) {
      const raw = env[key]?.trim();
      console.log(`  ${key}: ${raw === "true" ? "true ⚠" : raw ?? "(not set)"}`);
    }

    const dbUrl = env.DATABASE_URL?.trim();
    const prodDbUrl = env.PRODUCTION_DATABASE_URL?.trim();
    const pk = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const sk = env.CLERK_SECRET_KEY;
    const pkMode = keyModeFromPrefix(pk);
    const skMode = keyModeFromPrefix(sk);

    if (dbUrl) {
      const p = parseDatabaseUrl(dbUrl);
      console.log(`  DATABASE_URL target: ${maskDatabaseUrl(dbUrl)} [${classifyDatabase(p.host, p.database)}]`);
    }
    if (prodDbUrl) {
      const p = parseDatabaseUrl(prodDbUrl);
      const prodLike = isProductionLike(p.host, p.database);
      console.log(
        `  PRODUCTION_DATABASE_URL target: ${maskDatabaseUrl(prodDbUrl)} [${classifyDatabase(p.host, p.database)}${prodLike ? " ⚠ prod-like" : ""}]`,
      );
    }
    if (pkMode !== "unknown" || skMode !== "unknown") {
      console.log(`  Clerk key mode: publishable=${pkMode} secret=${skMode}`);
      if (pkMode !== "unknown" && skMode !== "unknown" && pkMode !== skMode) {
        console.log("  ⚠ Clerk publishable/secret mode mismatch");
      }
    }
    console.log("");
  }

  printProfile("Profile: development (npm run dev / pilot:preflight --development)", dev);
  printProfile("Profile: production pilot (pilot:preflight --production)", prodPilot);

  const prodPull = readEnvFile(".env.vercel.production.pull");
  const hasVercelProdDb = Boolean(prodPull.DATABASE_URL?.trim() || readEnvFile(".env.production.local").DATABASE_URL?.trim());
  const hasProdPilotAlias = Boolean(prodPilot.PRODUCTION_DATABASE_URL?.trim());

  console.log("Vercel production DATABASE_URL");
  console.log(`  On Vercel (remote): DATABASE_URL is set (no PRODUCTION_DATABASE_URL name in Vercel)`);
  console.log(`  Local pull has DATABASE_URL: ${hasVercelProdDb ? "yes" : "no"}`);
  console.log(`  Local PRODUCTION_DATABASE_URL (.env.pilot.prod.local): ${hasProdPilotAlias ? "yes" : "no"}`);
  console.log("");

  console.log("Recommended next steps");
  if (!fileExists(".env.local") || !varStatus(dev.DATABASE_URL).present) {
    console.log("  1. Run: npm run env:setup -- --dry-run then npm run env:setup -- --apply");
  } else {
    console.log("  1. Development profile looks configured — run: npm run pilot:preflight -- --development --all");
  }
  if (!hasProdPilotAlias) {
    console.log("  2. Pull prod env: vercel env pull .env.vercel.production.pull --environment=production --yes");
    console.log("  3. Run: npm run env:setup -- --apply  (copies DATABASE_URL → PRODUCTION_DATABASE_URL)");
  } else {
    console.log("  2. Production pilot profile present — run: npm run pilot:preflight -- --production --all");
  }
  if (fileExists(".env") && !fileExists(".env.legacy.archive")) {
    console.log("  · Archive bloated .env: npm run env:setup -- --apply (renames .env → .env.legacy.archive)");
  }
  console.log("  · Never commit .env.local or .env.pilot.prod.local (gitignored)");
  console.log("");

  const blockers: string[] = [];
  if (!varStatus(dev.DATABASE_URL).present && !varStatus(dev.CLERK_SECRET_KEY).present) {
    blockers.push("No dev DATABASE_URL or Clerk keys in .env.local");
  }
  if (!hasProdPilotAlias && !hasVercelProdDb) {
    blockers.push("No production database URL available locally — pull from Vercel or Neon dashboard");
  }

  if (blockers.length > 0) {
    console.log("Blockers");
    for (const b of blockers) console.log(`  - ${b}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
