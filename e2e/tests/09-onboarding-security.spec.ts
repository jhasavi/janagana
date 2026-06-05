import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_CLERK_EMAIL ?? process.env.CLERK_E2E_USER_EMAIL ?? "";
const password = process.env.E2E_CLERK_PASSWORD ?? "";

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

test("stale active tenant cookie is ignored and cleared on dashboard entry", async ({ page }) => {
  test.skip(!email || !password, "Real Clerk smoke blocked: missing E2E_CLERK_EMAIL/E2E_CLERK_PASSWORD");

  const signIn = await signInIfNeeded(page);
  test.skip(signIn.blockedBySso, "Real Clerk smoke pending: account uses Google SSO redirect flow.");

  await page.goto("/onboarding/create-organization");
  await expect(page).toHaveURL(/\/onboarding\/create-organization/);

  const currentUrl = page.url();
  await page.context().addCookies([
    {
      name: "JG_ACTIVE_TENANT_ID",
      value: "invalid-tenant-id",
      url: currentUrl,
      path: "/",
    },
  ]);

  await page.goto("/dashboard");
  const cookies = await page.context().cookies();
  const staleCookie = cookies.find((cookie) => cookie.name === "JG_ACTIVE_TENANT_ID");
  expect(staleCookie?.value).not.toBe("invalid-tenant-id");
  await expect(page).toHaveURL(/\/(dashboard|select-organization|onboarding\/create-organization)/);
  expect(page.url()).not.toContain("/sign-in");
});

test("community access page shows pilot scope without self-serve create", async ({ page }) => {
  test.skip(!email || !password, "Real Clerk smoke blocked: missing E2E_CLERK_EMAIL/E2E_CLERK_PASSWORD");

  const signIn = await signInIfNeeded(page);
  test.skip(signIn.blockedBySso, "Real Clerk smoke pending: account uses Google SSO redirect flow.");

  await page.goto("/onboarding/create-organization");
  await expect(page.getByText(/Namaste Boston/i).first()).toBeVisible();
  await expect(page.getByText(/Purple Wings/i).first()).toBeVisible();
});
