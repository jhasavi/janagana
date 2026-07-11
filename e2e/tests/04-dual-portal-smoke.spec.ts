import { test, expect } from "@playwright/test";

const TENANTS = [
  { slug: "purple-wings", name: "The Purple Wings" },
  { slug: "namaste-boston", name: "Namaste Boston" },
] as const;

test.beforeAll(async ({ request }) => {
  for (const tenant of TENANTS) {
    await request.get(`/portal/${tenant.slug}`, { timeout: 120_000 });
  }
});

for (const tenant of TENANTS) {
  test(`portal home loads for ${tenant.slug}`, async ({ page }) => {
    const response = await page.goto(`/portal/${tenant.slug}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    expect(response?.status()).toBe(200);
    await expect(page.getByText(tenant.name).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /view events/i })).toBeVisible();
  });

  test(`events page loads for ${tenant.slug}`, async ({ page }) => {
    const response = await page.goto(`/portal/${tenant.slug}/events`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /events/i })).toBeVisible();
  });
}
