import { defineConfig, devices } from "@playwright/test";

/**
 * playwright.config.ts — Synthetic/integration tests
 *
 * These tests use SYNTHETIC auth (no real Clerk login required).
 * They verify redirect logic, public portal behavior, and public registration.
 *
 * Do NOT add real Clerk smoke tests here.
 * Use playwright.real-clerk.config.ts for those.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: [
    "env-alignment.test.ts",
    "auth-state-machine.test.ts",
    "public-portal.test.ts",
    "public-registration.test.ts",
    "tenant-isolation.test.ts",
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    // No stored auth state — these tests must work without any session
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
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
