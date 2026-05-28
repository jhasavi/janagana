import { test, expect } from "@playwright/test";

const TS = process.env.QA_VERCEL_TS ?? String(Date.now());
const pwEmail = `qa-prod-vercel-pw-${TS}@example.com`;
const nbEmail = `qa-prod-vercel-nb-${TS}@example.com`;

test("purple wings newsletter", async ({ page }) => {
  await page.goto("/portal/purple-wings/contact?interest=newsletter");
  await page.getByLabel(/first name/i).fill("QA");
  await page.getByLabel(/last name/i).fill("VercelPW");
  await page.getByLabel(/email/i).fill(pwEmail);
  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page.getByText(/received your details|success/i)).toBeVisible({ timeout: 20000 });
  console.log(`PW_EMAIL=${pwEmail}`);
});

test("namaste boston investment", async ({ page }) => {
  await page.goto("/portal/namaste-boston/contact?interest=investment-analysis");
  await page.getByLabel(/first name/i).fill("QA");
  await page.getByLabel(/last name/i).fill("VercelNB");
  await page.getByLabel(/email/i).fill(nbEmail);
  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page.getByText(/received your details|success/i)).toBeVisible({ timeout: 20000 });
  console.log(`NB_EMAIL=${nbEmail}`);
});
