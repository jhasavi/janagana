import { test, expect } from "@playwright/test";

test("health route responds", async ({ request }) => {
  const response = await request.get("/api/health/ready");
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true, app: "janagana-v3" });
});

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(sign-in|dashboard|select-organization|onboarding\/create-organization)/);
});

test("dashboard placeholder loads or redirects predictably", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/(dashboard|sign-in|select-organization|onboarding\/create-organization)/);
});

test("portal loads for real tenant and 404s for unknown slug", async ({ page }) => {
  const notFound = await page.goto("/portal/does-not-exist-xyzzy");
  expect(notFound?.status()).toBe(404);

  const real = await page.goto("/portal/purple-wings");
  expect(real?.status()).toBe(200);
  await expect(page.getByText("The Purple Wings").first()).toBeVisible();
});
