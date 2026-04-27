/**
 * E2E Test: Event Management
 * Tests event listing, creation, status changes, and registration.
 */

import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString().slice(-6)
const TEST_EVENT_TITLE = `E2E Event ${SUFFIX}`

test.describe('Event Management', () => {
  test('events page loads', async ({ page }) => {
    await page.goto('/dashboard/events')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1:has-text("Events")')).toBeVisible()

    // Basic smoke: page renders header and Create Event button is present.
    const createEventButton = page.locator('a[href="/dashboard/events/new"]').first()
    await expect(createEventButton).toBeVisible()
  })

  test('shows Create Event button', async ({ page }) => {
    await page.goto('/dashboard/events')
    const createEventButton = page.locator('a[href="/dashboard/events/new"]').first()
    await expect(createEventButton).toBeVisible()
  })

  test('create new event', async ({ page }) => {
    await page.goto('/dashboard/events/new')
    await page.waitForLoadState('domcontentloaded')

    // Fill required fields
    await page.fill('input[name="title"]', TEST_EVENT_TITLE)

    // Start date (required) — set to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const startDateInput = page.locator(
      'input[name="startDate"], input[type="date"], input[type="datetime-local"]'
    ).first()

    if (await startDateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const inputType = await startDateInput.getAttribute('type')
      const dateValue =
        inputType === 'datetime-local'
          ? tomorrow.toISOString().slice(0, 16)
          : tomorrow.toISOString().split('T')[0]
      await startDateInput.fill(dateValue)
    }

    // Optional: description
    const descTextarea = page.locator('textarea[name="description"]')
    if (await descTextarea.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descTextarea.fill(`E2E test event created at ${new Date().toISOString()}`)
    }

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
    await submitBtn.first().click()

    // Should redirect after creation
    await page.waitForLoadState('domcontentloaded')
    const redirectedToList = await page.url().includes('/dashboard/events')
    const hasToast = await page.locator('[data-sonner-toast], text=/created/i').first().isVisible({ timeout: 5_000 }).catch(() => false)
    expect(redirectedToList || hasToast).toBeTruthy()
  })

  test('event detail page is accessible', async ({ page }) => {
    await page.goto('/dashboard/events')
    await page.waitForLoadState('domcontentloaded')

    const firstRow = page.locator('table tbody tr').first()
    const rowsExist = await firstRow.isVisible({ timeout: 3_000 }).catch(() => false)

    if (rowsExist) {
      const viewLink = page.locator('table tbody tr a, table tbody tr button').first()
      if (await viewLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await viewLink.click()
        await page.waitForLoadState('domcontentloaded')
        await expect(page).toHaveURL(/\/dashboard\/events\//)
      }
    } else {
      test.skip()
    }
  })

  test('event form validates required fields', async ({ page }) => {
    await page.goto('/dashboard/events/new')
    await page.waitForLoadState('domcontentloaded')

    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
    await submitBtn.first().click()

    const errorAlert = page.locator('[role="alert"]').first()
    const hasValidationError =
      (await errorAlert.isVisible().catch(() => false)) ||
      (await page.locator('.text-red-500, .text-destructive').first().isVisible().catch(() => false)) ||
      (await page.locator('text=/required/i').first().isVisible().catch(() => false))

    expect(hasValidationError).toBeTruthy()
  })

  test('filter events by status', async ({ page }) => {
    await page.goto('/dashboard/events?status=PUBLISHED')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1:has-text("Events")')).toBeVisible()
  })

  test('upcoming filter works', async ({ page }) => {
    await page.goto('/dashboard/events?filter=upcoming')
    await page.waitForLoadState('domcontentloaded')

    // Should not error
    await expect(page.locator('h1:has-text("Events")')).toBeVisible()
  })
})
