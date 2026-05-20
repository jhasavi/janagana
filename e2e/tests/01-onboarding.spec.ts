import { test, expect } from '@playwright/test'

// Regression test ensuring onboarding flows through to dashboard when a new org
// must be created, and that the active-org cookie fallback is available.
test('onboarding completes and redirects to dashboard', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'networkidle' })

  if (page.url().includes('/onboarding')) {
    const orgName = `E2E Org ${Date.now()}`
    await page.locator('#org-name').fill(orgName)
    await page.locator('button[type="submit"]:not([disabled])').click()

    await expect(page.locator('#tier-name')).toBeVisible({ timeout: 20000 })

    await page.locator('#tier-name').fill('E2E Member')
    await page.locator('button:has-text("Save & Continue")').click()

    await expect(page.locator('text=Your public entry points')).toBeVisible({ timeout: 20000 })
    await page.locator('button:has-text("Continue")').click()

    await expect(page.locator('#m-first')).toBeVisible({ timeout: 20000 })
    await page.locator('#m-first').fill('Jane')
    await page.locator('#m-last').fill('Doe')
    await page.locator('#m-email').fill(`e2e+${Date.now()}@example.com`)
    await page.locator('button:has-text("Add Member")').click()

    await expect(page.locator('#ev-title')).toBeVisible({ timeout: 20000 })
    await page.locator('#ev-title').fill('E2E Kickoff')
    const eventDate = new Date(Date.now() + 2 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16)
    await page.locator('#ev-date').fill(eventDate)
    await page.locator('button:has-text("Create Event")').click()

    await expect(page.locator('text=You\'re all set!')).toBeVisible({ timeout: 20000 })
    await page.locator('button:has-text("Go to Dashboard")').click()
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })

    const cookies = await page.context().cookies('http://localhost:3000')
    const cookieNames = cookies.map((cookie) => cookie.name)
    expect(cookieNames).toContain('JG_ACTIVE_ORG')
    expect(cookieNames).toContain('JG_TENANT_ID')
  }

  await expect(page).toHaveURL(/\/dashboard/)
})

test('authenticated user with existing org lands on dashboard', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/dashboard/)
})
