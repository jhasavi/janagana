import { test, expect } from '@playwright/test'

// Regression test ensuring onboarding flows through to dashboard when a new org
// must be created, and that the active-org cookie fallback is available.
test('onboarding completes and redirects to dashboard', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'networkidle' })

  if (page.url().includes('/onboarding')) {
    await page.locator('#org-name').fill(`E2E Org ${Date.now()}`)
    await page.locator('button[type="submit"]:not([disabled])').click()
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })

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
