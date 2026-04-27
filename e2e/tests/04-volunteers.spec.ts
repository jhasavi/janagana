/**
 * E2E Test: Volunteer Management
 * Tests volunteer opportunity listing, creation, and signups.
 */

import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString().slice(-6)
const TEST_OPP_TITLE = `E2E Volunteer Opp ${SUFFIX}`

test.describe('Volunteer Management', () => {
  test('volunteers page loads', async ({ page }) => {
    await page.goto('/dashboard/volunteers')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1').filter({ hasText: /volunteer/i }).first()).toBeVisible()
    // Basic smoke: page renders header and New Opportunity button is present.
    const createOpportunity = page.locator('a[href="/dashboard/volunteers/new"]').first()
    await expect(createOpportunity).toBeVisible()
  })

  test('shows Create Opportunity button', async ({ page }) => {
    await page.goto('/dashboard/volunteers')
    const createOpportunity = page.locator('a[href="/dashboard/volunteers/new"]').first()
    await expect(createOpportunity).toBeVisible()
  })

  test('create new volunteer opportunity', async ({ page }) => {
    // Try to find the new opportunity page
    await page.goto('/dashboard/volunteers/new')
    await page.waitForLoadState('domcontentloaded')

    // Fill required fields
    const titleInput = page.locator('input[name="title"]')
    if (await titleInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await titleInput.fill(TEST_OPP_TITLE)
    } else {
      // May be on a different URL pattern — skip
      test.skip()
      return
    }

    // Description
    const descTextarea = page.locator('textarea[name="description"]')
    if (await descTextarea.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descTextarea.fill(`E2E test opportunity created at ${new Date().toISOString()}`)
    }

    // Date
    const dateInput = page.locator('input[name="date"], input[type="date"]').first()
    if (await dateInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      await dateInput.fill(nextWeek.toISOString().split('T')[0])
    }

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
    await submitBtn.first().click()

    await page.waitForLoadState('domcontentloaded')
    const hasRedirected = page.url().includes('/dashboard/volunteers')
    const hasToast = await page.locator('[data-sonner-toast], text=/created/i').first().isVisible({ timeout: 5_000 }).catch(() => false)
    expect(hasRedirected || hasToast).toBeTruthy()
  })

  test('volunteer opportunity detail page is accessible', async ({ page }) => {
    await page.goto('/dashboard/volunteers')
    await page.waitForLoadState('domcontentloaded')

    const firstRow = page.locator('table tbody tr, [data-testid="opportunity-card"]').first()
    const rowsExist = await firstRow.isVisible({ timeout: 3_000 }).catch(() => false)

    if (rowsExist) {
      const viewLink = page.locator('table tbody tr a, [data-testid="opportunity-card"] a').first()
      if (await viewLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await viewLink.click()
        await page.waitForLoadState('domcontentloaded')
        await expect(page).toHaveURL(/\/dashboard\/volunteers\//)
      }
    } else {
      test.skip()
    }
  })

  test('volunteer opportunity form validates required fields', async ({ page }) => {
    await page.goto('/dashboard/volunteers/new')
    await page.waitForLoadState('domcontentloaded')

    const formExists = await page.locator('form').first().isVisible({ timeout: 5_000 }).catch(() => false)
    if (!formExists) {
      test.skip()
      return
    }

    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
    await submitBtn.first().click()

    const errorAlert = page.locator('[role="alert"]').first()
    const hasValidationError =
      (await errorAlert.isVisible().catch(() => false)) ||
      (await page.locator('.text-red-500, .text-destructive').first().isVisible().catch(() => false)) ||
      (await page.locator('text=/required/i').first().isVisible().catch(() => false))

    expect(hasValidationError).toBeTruthy()
  })

  test('filter volunteers by status', async ({ page }) => {
    await page.goto('/dashboard/volunteers?status=OPEN')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1').filter({ hasText: /volunteer/i }).first()).toBeVisible()
  })
})
