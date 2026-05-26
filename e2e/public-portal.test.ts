// AUTH_MODE: SYNTHETIC (no Clerk session required)
// PROVES: Public portal pages load without admin auth; tenant resolves by slug
// DOES_NOT_PROVE: Real Clerk session behavior; payment flows; admin operations

import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// These tests require a running server with seeded data.
// Seed: a Tenant with slug "namaste-boston" with at least one PUBLISHED event.

test.describe("Public portal (synthetic — no auth required)", () => {
  test("portal home loads without Clerk session", async ({ page }) => {
    await page.goto(`${BASE}/portal/namaste-boston`);
    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("unknown tenant slug returns 404", async ({ page }) => {
    const res = await page.goto(`${BASE}/portal/this-org-does-not-exist-xyz`);
    expect(res?.status()).toBe(404);
  });

  test("portal page does not set admin cookies", async ({ page, context }) => {
    await page.goto(`${BASE}/portal/namaste-boston`);
    const cookies = await context.cookies();
    const adminCookies = cookies.filter(
      (c) => c.name === "JG_ACTIVE_ORG" || c.name.startsWith("__clerk")
    );
    // No admin session cookies should be set from a portal-only visit
    expect(adminCookies.filter((c) => c.name === "JG_ACTIVE_ORG")).toHaveLength(0);
  });
});
