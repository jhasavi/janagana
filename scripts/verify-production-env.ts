#!/usr/bin/env tsx
/**
 * Production environment contract (run against prod secrets locally or in CI).
 *
 *   npm run verify:production-env
 *   npm run verify:production-env -- --strict
 */
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

function loadEnvFiles() {
  for (const file of [".env", ".env.local", ".env.pilot.prod.local"]) {
    const p = path.resolve(process.cwd(), file);
    if (fs.existsSync(p)) dotenv.config({ path: p, override: file !== ".env" });
  }
}

function keyMode(value: string): "test" | "live" | "unknown" {
  if (value.startsWith("pk_test_") || value.startsWith("sk_test_")) return "test";
  if (value.startsWith("pk_live_") || value.startsWith("sk_live_")) return "live";
  return "unknown";
}

loadEnvFiles();

const strict = process.argv.includes("--strict");
const errors: string[] = [];
const warnings: string[] = [];

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
const isProdHost = appUrl.includes("janagana.namasteneedham.com");

console.log("Production environment verification");
console.log(`APP_URL: ${appUrl || "(missing)"}`);
console.log(`Mode: ${strict || isProdHost ? "strict" : "advisory"}\n`);

const required = [
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
];

for (const key of required) {
  const value = process.env[key]?.trim() ?? "";
  if (!value || value.includes("REPLACE_ME")) {
    errors.push(`${key}: missing or placeholder`);
  }
}

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
const sk = process.env.CLERK_SECRET_KEY?.trim() ?? "";
if (pk && sk && keyMode(pk) !== keyMode(sk)) {
  errors.push("Clerk publishable/secret key mode mismatch");
}

if (strict || isProdHost) {
  if (keyMode(pk) !== "live") errors.push("Production requires pk_live_ Clerk keys");
  if (!appUrl.startsWith("https://")) errors.push("Production NEXT_PUBLIC_APP_URL must be https");
  if (appUrl.includes("localhost")) errors.push("Production APP_URL must not be localhost");

  const stripe = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const stripeWh = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  if (!stripe || keyMode(stripe) !== "live") {
    errors.push("Production requires sk_live_ STRIPE_SECRET_KEY");
  }
  if (!stripeWh) {
    errors.push("STRIPE_WEBHOOK_SECRET required for paid checkout in production");
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    warnings.push("RESEND_API_KEY missing — emails will queue but not deliver");
  }
  if (!process.env.CRON_SECRET?.trim()) {
    warnings.push("CRON_SECRET missing — Vercel cron renewal job will reject requests");
  }
  if (!process.env.OPS_ALERT_WEBHOOK_URL?.trim()) {
    warnings.push("OPS_ALERT_WEBHOOK_URL missing — no webhook alerts on failures");
  }
}

if (warnings.length) {
  console.log("Warnings:");
  for (const w of warnings) console.log(`- ${w}`);
}

if (errors.length) {
  console.error("\nErrors:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log("\nverify:production-env: PASS");
