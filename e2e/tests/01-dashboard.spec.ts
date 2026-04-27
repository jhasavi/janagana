/**
 * E2E Test: Dashboard Overview
 * Tests the main dashboard stats page renders correctly.
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // Wait for the page to fully load (Server Component data fetch)
    await page.waitForLoadState('domcontentloaded')
  })

  test('renders dashboard page with heading', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /dashboard/i }).first()).toBeVisible()
  })

  test('shows stat cards (Members, Events, Volunteers)', async ({ page }) => {
    // The dashboard shows stat cards — check for key metrics text
    const memberCard = page.locator('text=/member/i').first()
    await expect(memberCard).toBeVisible()

    const eventCard = page.locator('text=/event/i').first()
    await expect(eventCard).toBeVisible()

    const volunteerCard = page.locator('text=/volunteer/i').first()
    await expect(volunteerCard).toBeVisible()
  })

  test('shows quick action buttons', async ({ page }) => {
    // Dashboard has Add Member / Create Event quick actions
    const addMemberBtn = page.locator('a[href="/dashboard/members/new"], button:has-text("Add Member")')
    await expect(addMemberBtn.first()).toBeVisible()
  })

  test('sidebar navigation is present', async ({ page }) => {
    // Check sidebar nav links
    await expect(page.locator('aside nav a[href="/dashboard/members"]:has-text("Members")')).toBeVisible()
    await expect(page.locator('aside nav a[href="/dashboard/events"]:has-text("Events")')).toBeVisible()
    await expect(page.locator('aside nav a[href="/dashboard/volunteers"]:has-text("Volunteers")')).toBeVisible()
  })
})
