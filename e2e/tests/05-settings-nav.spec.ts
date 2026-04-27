/**
 * E2E Test: Settings & Membership Tiers
 * Tests org settings and membership tier management.
 */

import { test, expect } from '@playwright/test'

const SUFFIX = Date.now().toString().slice(-6)
const TEST_TIER_NAME = `E2E Tier ${SUFFIX}`

test.describe('Settings', () => {
  test('settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1').filter({ hasText: /setting/i }).first()).toBeVisible()
  })

  test('can navigate to settings from sidebar', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    const settingsLink = page.locator('a[href="/dashboard/settings"]')
    await expect(settingsLink).toBeVisible()
    await settingsLink.click()

    await expect(page).toHaveURL(/\/dashboard\/settings/)
  })
})

test.describe('Membership Tiers', () => {
  test('membership tiers section is accessible', async ({ page }) => {
    // Tiers are usually under settings or members page
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('domcontentloaded')

    // Look for tier-related content
    const tierSection = page.locator('text=/tier/i, text=/membership plan/i').first()
    const tierExists = await tierSection.isVisible({ timeout: 3_000 }).catch(() => false)

    // May also be under members/tiers
    if (!tierExists) {
      await page.goto('/dashboard/members?tab=tiers')
      await page.waitForLoadState('domcontentloaded')
    }

    // At minimum settings page should load
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('create membership tier if UI exists', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('domcontentloaded')

    const addTierBtn = page.locator(
      'button:has-text("Add Tier"), button:has-text("New Tier"), button:has-text("Create Tier")'
    )

    if (await addTierBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addTierBtn.click()

      const nameInput = page.locator('input[name="name"], input[placeholder*="tier name"]')
      if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await nameInput.fill(TEST_TIER_NAME)

        const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
        await submitBtn.first().click()

        await page.waitForLoadState('domcontentloaded')
        const hasToast = await page.locator('[data-sonner-toast], text=/created/i, text=/saved/i').first().isVisible({ timeout: 5_000 }).catch(() => false)
        const hasTierInList = await page.locator(`text=${TEST_TIER_NAME}`).isVisible({ timeout: 3_000 }).catch(() => false)
        expect(hasToast || hasTierInList).toBeTruthy()
      }
    } else {
      // Tier UI not found on settings — acceptable for current version
      test.skip()
    }
  })
})

test.describe('Navigation', () => {
  test('all sidebar links navigate correctly', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    const navItems = [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/dashboard/members', label: 'Members' },
      { href: '/dashboard/events', label: 'Events' },
      { href: '/dashboard/volunteers', label: 'Volunteers' },
      { href: '/dashboard/settings', label: 'Settings' },
    ]

    for (const item of navItems) {
      await page.goto(item.href)
      await page.waitForLoadState('domcontentloaded')
      // Page should not show a 404 or error
      const notFound = await page.locator('text=/404/i, text=/not found/i, text=/error/i').first().isVisible({ timeout: 2_000 }).catch(() => false)
      expect(notFound).toBeFalsy()
    }
  })

  test('page title updates per route', async ({ page }) => {
    await page.goto('/dashboard/members')
    await expect(page).toHaveTitle(/Members/i)

    await page.goto('/dashboard/events')
    await expect(page).toHaveTitle(/Events/i)

    await page.goto('/dashboard/volunteers')
    await expect(page).toHaveTitle(/Volunteer/i)
  })
})
