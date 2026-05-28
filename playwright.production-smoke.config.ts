import { defineConfig, devices } from "@playwright/test";

const baseURL = "https://janagana.namasteneedham.com";

export default defineConfig({
  testDir: "./e2e/tests",
  testMatch: ["06-production-lead-submit.spec.ts", "07-vercel-qa-leads.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    navigationTimeout: 30000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
