import { test, expect } from "@playwright/test";

const TENANTS = [
  { slug: "purple-wings", name: "The Purple Wings" },
  { slug: "namaste-boston", name: "Namaste Boston" },
] as const;

for (const tenant of TENANTS) {
  test(`portal home loads for ${tenant.slug}`, async ({ page }) => {
    const response = await page.goto(`/portal/${tenant.slug}`);
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
