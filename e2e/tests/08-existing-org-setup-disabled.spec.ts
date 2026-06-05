import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_CLERK_EMAIL ?? process.env.CLERK_E2E_USER_EMAIL ?? "";
const password = process.env.E2E_CLERK_PASSWORD ?? process.env.CLERK_E2E_PASSWORD ?? "";

async function signInIfNeeded(page: Page): Promise<{ blockedBySso: boolean }> {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(sign-in|dashboard|select-organization|onboarding\/create-organization)/);

  if (!page.url().includes("/sign-in")) {
    return { blockedBySso: false };
  }

  const emailInput = page.getByLabel(/email/i).first();
  await emailInput.fill(email);
  await page.getByRole("button", { name: /continue|sign in/i }).first().click();

  await page.waitForTimeout(1200);

  if (page.url().includes("accounts.google.com")) {
    return { blockedBySso: true };
  }

  const passwordInput = page.getByLabel(/password/i).first();
  if (!(await passwordInput.isVisible())) {
    throw new Error("BLOCKED_REAL_CLERK_SMOKE: password step not available after email submission.");
  }

  if (await passwordInput.isDisabled()) {
    throw new Error(
      "BLOCKED_REAL_CLERK_SMOKE: password field is disabled for this account; interactive provider flow required."
    );
  }

  await passwordInput.fill(password);
  await page.getByRole("button", { name: /continue|sign in/i }).first().click();
  return { blockedBySso: false };
}

test("existing organization mapping is locked by default in onboarding UI", async ({ page }) => {
  test.skip(!email || !password, "Real Clerk smoke blocked: missing E2E_CLERK_EMAIL/E2E_CLERK_PASSWORD");

  const signIn = await signInIfNeeded(page);
  test.skip(signIn.blockedBySso, "Real Clerk smoke pending: account uses Google SSO redirect flow.");

  await page.goto("/onboarding/create-organization");
  await expect(page).toHaveURL(/\/onboarding\/create-organization/);
  await expect(
    page.getByRole("heading", { name: /existing organization mapping is locked for the pilot/i })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /new community setup is disabled/i })).toBeVisible();
  await expect(page.getByText(/self-serve creation of new clerk organizations/i)).toBeVisible();
});
