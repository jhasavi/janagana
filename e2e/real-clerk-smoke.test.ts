// AUTH_MODE: REAL_CLERK
// PROVES: A real Clerk user can sign in, select an org, and reach the dashboard
// DOES_NOT_PROVE: Data correctness, edge cases, public portal behavior
//
// PREREQUISITES:
//   CLERK_E2E_USER_EMAIL and CLERK_E2E_USER_PASSWORD must be set in env
//   The test user must have at least one Clerk organization
//   The organization must have a mapped Tenant in the DB
//
// Run: npm run test:real-clerk

import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.CLERK_E2E_USER_EMAIL;
const PASSWORD = process.env.CLERK_E2E_USER_PASSWORD;

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "CLERK_E2E_USER_EMAIL and CLERK_E2E_USER_PASSWORD must be set for real Clerk smoke tests"
    );
  }
});

test("real Clerk smoke: sign in → dashboard", async ({ page }) => {
  // Navigate to root — should redirect to sign-in
  await page.goto(`${BASE}/`);
  await expect(page).toHaveURL(/\/sign-in/);

  // Fill in Clerk sign-in form
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in|continue/i }).click();

  // Should arrive at dashboard (may pass through /select-organization first)
  await expect(page).toHaveURL(/\/(dashboard|select-organization)/, { timeout: 15000 });

  // If on select-organization, click the first org
  if (page.url().includes("select-organization")) {
    await page.locator('[data-clerk-organization-list-item]').first().click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  }

  // Dashboard should show tenant name
  await expect(page.locator("h1, nav")).not.toBeEmpty();
});

test("real Clerk smoke: sign out returns to sign-in", async ({ page }) => {
  // (Assumes the session from the previous test may have ended — re-authenticate)
  await page.goto(`${BASE}/sign-in`);
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in|continue/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|select-organization)/, { timeout: 15000 });

  // Sign out
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 });
});
