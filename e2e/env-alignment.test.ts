// AUTH_MODE: none (env check only — no browser, no auth)
// PROVES: All required environment variables are present and correctly formatted
// DOES_NOT_PROVE: That the values are functional (e.g., Clerk keys may be present but expired)

import { test, expect } from "@playwright/test";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
else if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const REQUIRED_VARS = [
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
];

for (const varName of REQUIRED_VARS) {
  test(`env: ${varName} is set`, () => {
    const value = process.env[varName];
    expect(value, `${varName} is missing`).toBeTruthy();
    expect(value, `${varName} is a placeholder`).not.toContain("REPLACE_ME");
  });
}

test("env: Clerk key environment is consistent", () => {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const sk = process.env.CLERK_SECRET_KEY ?? "";
  if (!pk || !sk) return; // caught by individual checks above
  const pkIsLive = pk.startsWith("pk_live_");
  const skIsLive = sk.startsWith("sk_live_");
  expect(pkIsLive, "Clerk publishable and secret keys are from different environments").toBe(skIsLive);
});

test("env: .env.example contains no real secrets", () => {
  const examplePath = path.resolve(process.cwd(), ".env.example");
  expect(fs.existsSync(examplePath), ".env.example must exist").toBe(true);
  const content = fs.readFileSync(examplePath, "utf-8");
  expect(content).not.toMatch(/pk_live_[A-Za-z0-9]+/);
  expect(content).not.toMatch(/sk_live_[A-Za-z0-9]+/);
  expect(content).not.toMatch(/whsec_[A-Za-z0-9]{20,}/);
});
