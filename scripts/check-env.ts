#!/usr/bin/env tsx
/**
 * scripts/check-env.ts
 *
 * Validates that all required environment variables are present and
 * that Clerk key environment (test vs live) matches intent.
 *
 * Run: npm run check:env
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load .env.local first, then .env
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
else if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
];

const errors: string[] = [];
const warnings: string[] = [];

// Check required vars
for (const key of REQUIRED) {
  const value = process.env[key];
  if (!value || value.includes("REPLACE_ME") || value.trim() === "") {
    errors.push(`  ✗ ${key} is missing or placeholder`);
  } else {
    console.log(`  ✓ ${key}`);
  }
}

// Clerk key environment alignment
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.CLERK_SECRET_KEY ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

if (publishableKey && secretKey) {
  const pkIsLive = publishableKey.startsWith("pk_live_");
  const skIsLive = secretKey.startsWith("sk_live_");
  const urlIsLocalhost = appUrl.includes("localhost");

  if (pkIsLive !== skIsLive) {
    errors.push("  ✗ Clerk key mismatch: publishable and secret keys are from different environments");
  }

  if (pkIsLive && urlIsLocalhost) {
    warnings.push("  ⚠ Using live Clerk keys with localhost URL — ensure this is intentional");
  }

  if (!pkIsLive && !urlIsLocalhost) {
    warnings.push("  ⚠ Using test Clerk keys with non-localhost URL — ensure this is intentional");
  }
}

// Check for secrets in .env.example
const examplePath = path.resolve(process.cwd(), ".env.example");
if (fs.existsSync(examplePath)) {
  const exampleContent = fs.readFileSync(examplePath, "utf-8");
  const suspiciousPatterns = [/pk_live_[A-Za-z0-9]+/, /sk_live_[A-Za-z0-9]+/, /whsec_[A-Za-z0-9]+/];
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(exampleContent)) {
      errors.push(`  ✗ .env.example appears to contain a real secret (matched ${pattern})`);
    }
  }
}

// Report
console.log("\n");
if (warnings.length > 0) {
  console.warn("Warnings:");
  warnings.forEach((w) => console.warn(w));
  console.log("");
}

if (errors.length > 0) {
  console.error("Errors:");
  errors.forEach((e) => console.error(e));
  console.error(`\nenv check FAILED (${errors.length} error${errors.length !== 1 ? "s" : ""})\n`);
  process.exit(1);
}

console.log("env check PASSED\n");
