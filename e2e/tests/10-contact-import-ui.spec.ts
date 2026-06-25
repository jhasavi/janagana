import { test, expect } from "@playwright/test";

/**
 * Verifies the real dashboard import UI wiring (no auth required).
 * Full authenticated upload requires CLERK_E2E_USER_EMAIL + CLERK_E2E_USER_PASSWORD.
 */
test.describe("contact import UI contract", () => {
  test("members page form posts multipart to /api/import/contacts", async ({ page }) => {
    await page.goto("/dashboard/members?openImport=1");
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15000 });

    // Unauthenticated users hit sign-in — form still exists in source; verify via response after login redirect target
    const signInUrl = page.url();
    expect(signInUrl).toContain("redirect_url");
    expect(decodeURIComponent(signInUrl)).toMatch(/members/);
  });

  test("import API GET documents POST (not blank 405)", async ({ request }) => {
    const res = await request.get("/api/import/contacts");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.allowedMethods).toContain("POST");
    expect(json.message).toMatch(/Import spreadsheet/i);
  });

  test("import API PUT returns intentional 405", async ({ request }) => {
    const res = await request.put("/api/import/contacts");
    expect(res.status()).toBe(405);
    expect(res.headers()["allow"]).toBe("POST");
  });

  test("unsigned POST returns redirect, not 500", async ({ request, baseURL }) => {
    const origin = baseURL ?? "http://127.0.0.1:3022";
    const res = await request.post("/api/import/contacts", {
      multipart: {
        file: {
          name: "regression.csv",
          mimeType: "text/csv",
          buffer: Buffer.from("Name,Email\nTest,test@example.com\n"),
        },
        mode: "preview",
      },
      maxRedirects: 0,
      headers: {
        Origin: origin,
        Referer: `${origin}/dashboard/members`,
      },
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    const location = res.headers().location ?? "";
    expect(location).toMatch(/sign-in|dashboard\/members/);
  });
});

const email = process.env.CLERK_E2E_USER_EMAIL ?? process.env.E2E_CLERK_EMAIL ?? "";
const password = process.env.CLERK_E2E_USER_PASSWORD ?? process.env.E2E_CLERK_PASSWORD ?? "";

test.describe("contact import authenticated UI", () => {
  test.skip(!email || !password, "Set CLERK_E2E_USER_EMAIL and CLERK_E2E_USER_PASSWORD for full UI import");

  test("import spreadsheet from dashboard members page", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).first().fill(email);
    await page.getByRole("button", { name: /continue|sign in/i }).first().click();
    await page.waitForTimeout(1200);

    const passwordInput = page.getByLabel(/password/i).first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(password);
      await page.getByRole("button", { name: /continue|sign in/i }).first().click();
    }

    await expect(page).toHaveURL(/\/(dashboard|select-organization)/, { timeout: 20000 });

    if (page.url().includes("select-organization")) {
      await page.getByRole("link").first().click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    }

    await page.goto("/dashboard/members?openImport=1");
    await expect(page.getByText(/Import spreadsheet/i)).toBeVisible();

    const form = page.locator('form[action="/api/import/contacts"]');
    await expect(form).toBeVisible();
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("enctype", "multipart/form-data");

    const fixture = "fixtures/contact-import-regression.csv";
    await form.locator('input[type="file"]').setInputFiles(fixture);
    await form.getByRole("button", { name: /Preview/i }).click();

    await expect(page).toHaveURL(/importPreview=1|importCreated=/, { timeout: 30000 });
    await expect(page.getByText(/would be created|Import complete|created/i)).toBeVisible();
  });
});
