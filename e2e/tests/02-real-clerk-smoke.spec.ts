import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_CLERK_EMAIL ?? "";
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

test("real Clerk login and sign-out spine", async ({ page, context }) => {
  test.skip(!email || !password, "Real Clerk smoke blocked: missing E2E_CLERK_EMAIL/E2E_CLERK_PASSWORD");

  const signIn = await signInIfNeeded(page);
  test.skip(signIn.blockedBySso, "Real Clerk smoke pending: account uses Google SSO redirect flow.");

  await expect(page).toHaveURL(/\/(dashboard|select-organization|onboarding\/create-organization)/);

  if (page.url().includes("/dashboard") || page.url().includes("/select-organization")) {
    const signOutButton = page.getByRole("button", { name: /sign out/i }).first();
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();
    await expect(page).toHaveURL(/\/sign-in/);

    const appCookies = (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("JG_ACTIVE")
    );
    expect(appCookies).toHaveLength(0);
  }
});

test("onboarding remains accessible and org actions visible for signed-in user", async ({ page }) => {
  test.skip(!email || !password, "Real Clerk smoke blocked: missing E2E_CLERK_EMAIL/E2E_CLERK_PASSWORD");

  const signIn = await signInIfNeeded(page);
  test.skip(signIn.blockedBySso, "Real Clerk smoke pending: account uses Google SSO redirect flow.");

  await page.goto("/onboarding/create-organization");
  await expect(page).toHaveURL(/\/onboarding\/create-organization/);
  await expect(page.getByRole("heading", { name: /set up organization/i })).toBeVisible();
  await expect(page.getByLabel(/organization name/i)).toBeVisible();
  await expect(page.getByLabel(/organization slug/i)).toBeVisible();

  await page.goto("/select-organization");
  await expect(page).toHaveURL(/\/(select-organization|dashboard)/);

  // In single-tenant mode this page may still be directly visible or redirect quickly to dashboard.
  // Validate that users can find create-organization affordance from at least one path.
  if (page.url().includes("/select-organization")) {
    await expect(page.getByRole("link", { name: /create another organization/i })).toBeVisible();

    const tenantCards = page.locator("form[action]").filter({ has: page.locator("input[name='tenantId']") });
    const tenantCount = await tenantCards.count();
    if (tenantCount === 1) {
      await expect(page.getByRole("button", { name: /continue to dashboard/i })).toBeVisible();
      await expect(page.getByText(/you currently have one organization/i)).toBeVisible();
    }
  } else {
    await page.goto("/dashboard/settings");
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
  }
});
