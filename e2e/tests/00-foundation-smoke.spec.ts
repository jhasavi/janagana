import { test, expect } from "@playwright/test";

test("health route responds", async ({ request }) => {
  const response = await request.get("/api/health/ready");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.app).toBe("janagana");
  expect(body.database).toBe("ok");
});

test("home page loads as the public marketing landing page for logged-out visitors", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(page.getByRole("heading", { name: /Keep your website/i })).toBeVisible();
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
