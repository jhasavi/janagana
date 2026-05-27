import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
}
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

const missing = ["E2E_CLERK_EMAIL", "E2E_CLERK_PASSWORD"].filter(
  (key) => !(process.env[key] && process.env[key]!.trim().length > 0)
);

if (missing.length > 0) {
  throw new Error(`Missing required env for real Clerk smoke: ${missing.join(", ")}`);
}

/**
 * playwright.real-clerk.config.ts — Real Clerk smoke tests and full workflow
 *
 * These tests use REAL Clerk credentials. They require:
 *   CLERK_E2E_USER_EMAIL — a real test user email in Clerk
 *   CLERK_E2E_USER_PASSWORD — the user's password
 *
 * These credentials must NEVER be committed. Store in CI secrets or local .env.local only.
 *
 * Run: npm run test:real-clerk
 *
 * These tests are NOT run in CI by default — they require explicit opt-in.
 */
export default defineConfig({
  testDir: "./e2e/tests",
  testMatch: ["02-real-clerk-smoke.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3021",
    trace: "on-first-retry",
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3021",
    url: "http://127.0.0.1:3021/api/health/ready",
    reuseExistingServer: false,
    timeout: 90000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
