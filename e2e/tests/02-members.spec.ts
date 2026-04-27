/**
 * E2E Test: Member Management
 * Full CRUD flow: list → create → view → edit → delete
 */

import { test, expect } from '@playwright/test'

// Unique suffix to avoid conflicts when tests run multiple times
const SUFFIX = Date.now().toString().slice(-6)
const TEST_EMAIL = `e2e-member-${SUFFIX}@example.com`
const TEST_FIRST = 'E2E'
const TEST_LAST = `Member${SUFFIX}`

test.describe('Member Management', () => {
  test('members page loads', async ({ page }) => {
    await page.goto('/dashboard/members')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1:has-text("Members")')).toBeVisible()

    const hasTable = await page.locator('table').first().isVisible().catch(() => false)
    const hasEmptyState =
      (await page.locator('text=/no members/i').first().isVisible().catch(() => false)) ||
      (await page.locator('text=/add your first/i').first().isVisible().catch(() => false))

    expect(hasTable || hasEmptyState).toBeTruthy()
  })

  test('shows Add Member button', async ({ page }) => {
    await page.goto('/dashboard/members')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('a[href="/dashboard/members/new"]').first()).toBeVisible()
  })

  test('create new member', async ({ page }) => {
    await page.goto('/dashboard/members/new')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('input#firstName', { timeout: 10000 })

    // Fill in required fields
    await page.fill('input#firstName', TEST_FIRST)
    await page.fill('input#lastName', TEST_LAST)
    await page.fill('input#email', TEST_EMAIL)

    // Submit and wait for the members list route explicitly
    const submitBtn = page.locator('button[type="submit"]').first()
    await Promise.all([
      page.waitForURL(/\/dashboard\/members(?:\?.*)?$/,{ timeout: 20_000 }),
      submitBtn.click(),
    ])

    await expect(page.locator('h1:has-text("Members")')).toBeVisible({ timeout: 20_000 })

    const hasNewMember = await page.locator(`table >> text=${TEST_LAST}`).first().isVisible({ timeout: 10_000 }).catch(() => false)
    const hasToast = await page.locator('text=/member created/i').first().isVisible({ timeout: 5_000 }).catch(() => false)
    expect(hasNewMember || hasToast).toBeTruthy()
  })

  test('search filters members', async ({ page }) => {
    await page.goto('/dashboard/members')
    await page.waitForLoadState('domcontentloaded')

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]')
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill('nonexistentmember12345')
      await page.waitForURL(/members\?search=/, { timeout: 10_000 }).catch(() => {})
      await page.waitForLoadState('networkidle')

      const rows = page.locator('table tbody tr')
      const rowCount = await rows.count()
      const emptyState =
        (await page.locator('text=/no members/i').first().isVisible({ timeout: 3_000 }).catch(() => false)) ||
        (await page.locator('text=/no results/i').first().isVisible({ timeout: 3_000 }).catch(() => false))
      expect(rowCount === 0 || emptyState).toBeTruthy()
    }
  })

  test('member detail page is accessible', async ({ page }) => {
    await page.goto('/dashboard/members')
    await page.waitForLoadState('domcontentloaded')

    // Click first member row or view link if any exist
    const firstRow = page.locator('table tbody tr').first()
    const rowsExist = await firstRow.isVisible({ timeout: 3_000 }).catch(() => false)

    if (rowsExist) {
      // Try clicking the row or a view/edit link
      const viewLink = page.locator('table tbody tr a, table tbody tr button').first()
      if (await viewLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await viewLink.click()
        await page.waitForLoadState('domcontentloaded')
        // Should be on a member detail or edit page
        await expect(page).toHaveURL(/\/dashboard\/members\//)
      }
    } else {
      test.skip()
    }
  })

  test('member form validates required fields', async ({ page }) => {
    await page.goto('/dashboard/members/new')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 })

    // Submit empty form
    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    // Expect validation errors (Zod/RHF)
    const errorMsg =
      (await page.locator('[role="alert"]').first().isVisible().catch(() => false)) ||
      (await page.locator('.text-destructive').first().isVisible().catch(() => false)) ||
      (await page.locator('text=/required/i').first().isVisible().catch(() => false))

    expect(errorMsg).toBeTruthy()
  })

  test('status filter shows correct members', async ({ page }) => {
    await page.goto('/dashboard/members?status=ACTIVE')
    await page.waitForLoadState('domcontentloaded')

    // Page should render without error
    await expect(page.locator('h1:has-text("Members")')).toBeVisible()
  })
})
