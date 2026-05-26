import { test, expect } from "@playwright/test";

test("health route responds", async ({ request }) => {
  const response = await request.get("/api/health/ready");
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true, app: "janagana-v3" });
});

test("home page loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByText("JanaGana v3 foundation")).toBeVisible();
});

test("dashboard placeholder loads or redirects predictably", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/(dashboard|sign-in|select-organization|onboarding\/create-organization)/);
});

test("portal placeholder loads", async ({ page }) => {
  const response = await page.goto("/portal/foundation");
  expect(response?.status()).toBeGreaterThanOrEqual(200);
  await expect(page.getByText("Tenant portal")).toBeVisible();
});
