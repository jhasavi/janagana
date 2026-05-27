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
  testDir: "./e2e/tests",
  testMatch: ["**/*.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3020",
    trace: "on-first-retry",
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3020",
    url: "http://127.0.0.1:3020/api/health/ready",
    reuseExistingServer: false,
    timeout: 60000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
