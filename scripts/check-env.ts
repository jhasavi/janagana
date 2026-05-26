#!/usr/bin/env tsx
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

function loadEnvFiles() {
  const envPath = path.resolve(process.cwd(), ".env");
  const envLocalPath = path.resolve(process.cwd(), ".env.local");

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
  }
}

function fingerprint(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function keyModeFromPrefix(key: string): "test" | "live" | "unknown" {
  if (key.startsWith("pk_test_") || key.startsWith("sk_test_")) return "test";
  if (key.startsWith("pk_live_") || key.startsWith("sk_live_")) return "live";
  return "unknown";
}

loadEnvFiles();

const REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
];

const errors: string[] = [];
const warnings: string[] = [];

console.log("Environment contract check");
for (const key of REQUIRED) {
  const value = process.env[key]?.trim() ?? "";
  const isPlaceholder = value.includes("REPLACE_ME") || value.includes("<");
  const present = value.length > 0 && !isPlaceholder;
  if (!present) {
    errors.push(`${key}: missing`);
    console.log(`- ${key}: missing`);
    continue;
  }
  const mode = key.includes("CLERK") && (key.includes("PUBLISHABLE") || key.includes("SECRET"))
    ? keyModeFromPrefix(value)
    : "n/a";
  console.log(`- ${key}: present (mode=${mode}, fp=${fingerprint(value)})`);
}

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
const sk = process.env.CLERK_SECRET_KEY?.trim() ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
const pkMode = keyModeFromPrefix(pk);
const skMode = keyModeFromPrefix(sk);

if (pk && sk && pkMode !== "unknown" && skMode !== "unknown" && pkMode !== skMode) {
  errors.push("Clerk key mode mismatch between publishable and secret keys");
}

if (pkMode === "live" && appUrl.includes("localhost")) {
  warnings.push("Live Clerk keys with localhost URL");
}

if (pkMode === "test" && !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1")) {
  warnings.push("Test Clerk keys with non-local URL");
}

const examplePath = path.resolve(process.cwd(), ".env.example");
if (fs.existsSync(examplePath)) {
  const example = fs.readFileSync(examplePath, "utf8");
  const hasLive = /pk_live_[A-Za-z0-9]+|sk_live_[A-Za-z0-9]+/.test(example)
    && !example.includes("pk_live_REPLACE_ME")
    && !example.includes("sk_live_REPLACE_ME");
  const hasWebhook = /whsec_[A-Za-z0-9]{10,}/.test(example) && !example.includes("whsec_REPLACE_ME");
  if (hasLive || hasWebhook) {
    errors.push(".env.example appears to contain a real secret value");
  }
}

if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error("Errors:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("check-env: PASS");
