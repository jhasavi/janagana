import { test, expect } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(sign-in|dashboard|$)/);
});

test("dashboard route exists or redirects", async ({ page }) => {
  const response = await page.goto("/dashboard");
  expect(response).not.toBeNull();
  await expect(page).toHaveURL(/\/(dashboard|sign-in|select-organization|onboarding\/create-organization)/);
});

test("portal placeholder route responds", async ({ page }) => {
  const response = await page.goto("/portal/foundation-smoke");
  expect(response?.status()).toBeGreaterThanOrEqual(200);
});
