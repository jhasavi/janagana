import { test, expect } from "@playwright/test";

const MARKER = `qa-prod-${Date.now().toString(36).slice(-6)}`;

test.describe("production lead capture", () => {
  test("purple wings newsletter submit", async ({ page }) => {
    const email = `${MARKER}-pw@example.com`;
    await page.goto("/portal/purple-wings/contact?interest=newsletter");
    await expect(page.getByText(/newsletter/i)).toBeVisible();
    await page.getByLabel(/first name/i).fill("QA");
    await page.getByLabel(/last name/i).fill("PurpleWings");
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page.getByText(/received your details|success/i)).toBeVisible({ timeout: 15000 });
  });

  test("namaste boston investment submit", async ({ page }) => {
    const email = `${MARKER}-nb@example.com`;
    await page.goto("/portal/namaste-boston/contact?interest=investment");
    await expect(page.getByText(/investment analysis/i)).toBeVisible();
    await page.getByLabel(/first name/i).fill("QA");
    await page.getByLabel(/last name/i).fill("NamasteBoston");
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page.getByText(/received your details|success/i)).toBeVisible({ timeout: 15000 });
  });
});
