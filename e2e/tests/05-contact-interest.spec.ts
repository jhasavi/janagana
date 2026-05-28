import { test, expect } from "@playwright/test";

test("investment interest alias resolves on contact page", async ({ page }) => {
  await page.goto("/portal/namaste-boston/interest/investment");
  await expect(page).toHaveURL(/interest=investment_analysis/);
  await expect(page.getByText(/investment analysis/i)).toBeVisible();
});

test("contact page accepts investment query param", async ({ page }) => {
  await page.goto("/portal/purple-wings/contact?interest=investment");
  await expect(page.getByText(/investment analysis/i)).toBeVisible();
});
