import { config as loadEnv } from "dotenv";

/** Load env for pilot CLI tools. Avoids bloated legacy `.env` when canonical files exist. */
export function loadPilotEnvFiles(profile: "development" | "production" | "default" = "default") {
  if (profile === "production") {
    // override: true so dev keys from a prior .env.local load are replaced by live keys
    loadEnv({ path: ".env.pilot.prod.local", override: true });
    return;
  }
  if (profile === "development") {
    loadEnv({ path: ".env.local", override: true });
    return;
  }
  loadEnv({ path: ".env.local" });
  loadEnv({ path: ".env.pilot.prod.local", override: false });
}

/** Prefer explicit production URL when running against prod from a laptop. */
export function resolveDatabaseUrl(profile?: "development" | "production") {
  if (profile === "production") {
    loadPilotEnvFiles("production");
    const url = process.env.PRODUCTION_DATABASE_URL?.trim();
    if (url) process.env.DATABASE_URL = url;
    return url ?? "";
  }
  if (profile === "development") {
    loadPilotEnvFiles("development");
    return process.env.DATABASE_URL?.trim() ?? "";
  }
  if (process.env.PRODUCTION_DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = process.env.PRODUCTION_DATABASE_URL.trim();
  }
  return process.env.DATABASE_URL?.trim() ?? "";
}

export function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    out[key] = value === undefined ? true : value;
  }
  return out;
}

export function parseDatabaseUrl(raw: string | undefined) {
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

export function isProductionLike(host: string, database: string) {
  const signal = `${host} ${database}`;
  const prodTokens = ["prod", "production", "live", "neon.tech"];
  const safeTokens = ["localhost", "127.0.0.1", "local", "dev", "test"];
  const hasProd = prodTokens.some((t) => signal.includes(t));
  const hasSafe = safeTokens.some((t) => signal.includes(t));
  return hasProd || (!hasSafe && host !== "unknown");
}

export function requireDatabaseUrl() {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error("Set PRODUCTION_DATABASE_URL or DATABASE_URL");
  }
  return url;
}

export function printDatabaseTarget(label: string) {
  const parsed = parseDatabaseUrl(resolveDatabaseUrl());
  console.log(`${label}`);
  console.log(`Database: ${parsed.host} / ${parsed.database}`);
  if (isProductionLike(parsed.host, parsed.database)) {
    console.log("WARNING: target looks like production. Double-check before applying.");
  }
}

export function maskId(value: string | null | undefined): string {
  const v = value?.trim() ?? "";
  if (!v) return "(missing)";
  if (v.length <= 12) return `${v.slice(0, 4)}…`;
  return `${v.slice(0, 8)}…${v.slice(-4)}`;
}

/** Mask connection strings and API secrets — never print full values. */
export function maskSecret(value: string | null | undefined): string {
  const v = value?.trim() ?? "";
  if (!v) return "(not set)";
  if (v.includes("REPLACE_ME") || v.includes("<")) return "(placeholder)";
  if (v.length <= 8) return "****";
  return `${v.slice(0, 4)}…${v.slice(-4)} (len=${v.length})`;
}

export function maskDatabaseUrl(raw: string | null | undefined): string {
  const v = raw?.trim() ?? "";
  if (!v) return "(not set)";
  try {
    const u = new URL(v);
    const host = u.hostname || "unknown";
    const database = (u.pathname || "/").replace(/^\//, "") || "unknown";
    const user = u.username ? `${u.username.slice(0, 2)}…` : "";
    return `postgresql://${user ? `${user}@` : ""}${host}/${database}`;
  } catch {
    return "(invalid url)";
  }
}

export function classifyDatabase(host: string, database: string): "local" | "dev" | "preview" | "production" | "unknown" {
  const signal = `${host} ${database}`.toLowerCase();
  if (signal.includes("localhost") || signal.includes("127.0.0.1")) return "local";
  if (signal.includes("preview") || signal.includes("staging")) return "preview";
  if (isProductionLike(host, database)) return "production";
  if (signal.includes("dev") || signal.includes("test")) return "dev";
  return "unknown";
}

export function keyModeFromPrefix(key: string | null | undefined): "test" | "live" | "unknown" {
  const value = key?.trim() ?? "";
  if (value.startsWith("pk_test_") || value.startsWith("sk_test_")) return "test";
  if (value.startsWith("pk_live_") || value.startsWith("sk_live_")) return "live";
  return "unknown";
}

export function parseArgsList(argv: string[]) {
  const flags: Record<string, string | boolean> = {};
  const tenants: string[] = [];

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    const key = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    const value = eq === -1 ? true : arg.slice(eq + 1);

    if (key === "tenant" && typeof value === "string" && value.trim()) {
      tenants.push(value.trim());
      continue;
    }

    flags[key] = value === undefined ? true : value;
  }

  return { flags, tenants };
}
