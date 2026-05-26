import { defineConfig, devices } from "@playwright/test";

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
  testDir: "./e2e",
  testMatch: [
    "real-clerk-smoke.test.ts",
    "first-workflow.test.ts",
  ],
  fullyParallel: false, // Real Clerk tests share session state — run serially
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for real-Clerk — flaky retries can create duplicate data
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
