import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'

test('first-user journey completes onboarding, dashboard, event/member creation, and sign-out verification', async ({ page }) => {
  const orgName = `E2E Org ${randomUUID().slice(0, 6)}`
  await page.goto('/', { waitUntil: 'networkidle' })

  if (page.url().includes('/onboarding')) {
    await page.locator('#org-name').fill(orgName)
    await page.locator('button[type="submit"]:not([disabled])').click()
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 })
  } else {
    await expect(page).toHaveURL(/\/dashboard/)
  }

  const sidebarBrand = page.locator('aside a[href="/dashboard"] span').first()
  await expect(sidebarBrand).toBeVisible()
  await expect(sidebarBrand).not.toHaveText(/Jana Gana|Dashboard/i)

  await page.goto('/dashboard/events/new', { waitUntil: 'networkidle' })
  await page.fill('input[name="title"]', `E2E Event ${randomUUID().slice(0, 6)}`)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const startDateInput = page.locator('input[name="startDate"], input[type="date"], input[type="datetime-local"]').first()
  if (await startDateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    const inputType = await startDateInput.getAttribute('type')
    const dateValue =
      inputType === 'datetime-local'
        ? tomorrow.toISOString().slice(0, 16)
        : tomorrow.toISOString().split('T')[0]
    await startDateInput.fill(dateValue)
  }

  await page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first().click()
  await page.waitForURL(/\/dashboard\/events/, { timeout: 60_000 })
  await expect(page.locator('h1:has-text("Events")')).toBeVisible()

  await page.goto('/dashboard/members/new', { waitUntil: 'networkidle' })
  await page.fill('#firstName', 'E2E')
  await page.fill('#lastName', 'Member')
  await page.fill('#email', `e2e+${Date.now()}@example.com`)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/dashboard\/members/, { timeout: 60_000 })
  await expect(page.locator('h1:has-text("Members")')).toBeVisible()

  const authlessContext = await page.context().browser()?.newContext()
  if (!authlessContext) {
    throw new Error('Unable to create a new browser context for authless verification')
  }

  const signInPage = await authlessContext.newPage()
  await signInPage.goto('/sign-in', { waitUntil: 'networkidle' })
  await expect(signInPage.locator('h1')).not.toHaveText(/Jana Gana/i)
  await authlessContext.close()
})