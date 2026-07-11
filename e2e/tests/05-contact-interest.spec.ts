import { test, expect } from "@playwright/test";

test.beforeAll(async ({ request }) => {
  await request.get("/portal/namaste-boston/interest/investment", { timeout: 120_000 });
});

test("investment interest alias resolves on contact page", async ({ page }) => {
  await page.goto("/portal/namaste-boston/interest/investment", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForURL(/interest=investment_analysis/, { timeout: 15_000 });
  await expect(page.getByRole("main").getByTestId("portal-flow-description")).toHaveText(/investment analysis/i);
});

test("contact page accepts investment query param", async ({ page }) => {
  await page.goto("/portal/purple-wings/contact?interest=investment");
  await expect(page.getByRole("main").getByTestId("portal-flow-description")).toHaveText(/investment analysis/i);
});
