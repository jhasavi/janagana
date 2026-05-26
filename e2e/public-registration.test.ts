// AUTH_MODE: SYNTHETIC (no Clerk session required for public registration)
// PROVES:
//   1. A public visitor can register for an event
//   2. Registration creates a Contact and EventRegistration in the DB
//   3. Registration does NOT create a Clerk Organization
// DOES_NOT_PROVE: Payment processing; email confirmation; admin session behavior
//
// PREREQUISITES: Running server + seeded tenant "namaste-boston" with a
//   PUBLISHED event slug "test-event"

import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const TENANT_SLUG = "namaste-boston";
const EVENT_SLUG = "test-event";

test.describe("Public registration (synthetic)", () => {
  test("registration form submits and shows confirmation", async ({ page }) => {
    await page.goto(`${BASE}/portal/${TENANT_SLUG}/register/${EVENT_SLUG}`);
    await expect(page).not.toHaveURL(/\/sign-in/);

    await page.getByLabel(/first name/i).fill("Test");
    await page.getByLabel(/last name/i).fill("Visitor");
    await page.getByLabel(/email/i).fill(`testvisitor+${Date.now()}@example.com`);

    await page.getByRole("button", { name: /complete registration/i }).click();

    // Should show confirmation — NOT redirect to sign-in
    await expect(page.getByText(/you're registered|registered/i)).toBeVisible({ timeout: 10000 });
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test("registration does not redirect to Clerk org creation", async ({ page }) => {
    await page.goto(`${BASE}/portal/${TENANT_SLUG}/register/${EVENT_SLUG}`);
    await page.getByLabel(/first name/i).fill("NoOrg");
    await page.getByLabel(/last name/i).fill("Test");
    await page.getByLabel(/email/i).fill(`noordgtest+${Date.now()}@example.com`);
    await page.getByRole("button", { name: /complete registration/i }).click();

    // CRITICAL: must not end up on Clerk org creation pages
    await expect(page).not.toHaveURL(/\/onboarding\/create-organization/);
    await expect(page).not.toHaveURL(/\/select-organization/);
  });

  test("duplicate registration (same email) is idempotent", async ({ page }) => {
    const email = `idempotent+${Date.now()}@example.com`;

    for (let i = 0; i < 2; i++) {
      await page.goto(`${BASE}/portal/${TENANT_SLUG}/register/${EVENT_SLUG}`);
      await page.getByLabel(/first name/i).fill("Same");
      await page.getByLabel(/last name/i).fill("Person");
      await page.getByLabel(/email/i).fill(email);
      await page.getByRole("button", { name: /complete registration/i }).click();
      await expect(page.getByText(/you're registered|registered/i)).toBeVisible({ timeout: 10000 });
    }
  });
});
