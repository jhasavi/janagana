/**
 * E2E Test: Help Center routing and content
 * Verifies public help pages, dashboard-scoped help routes,
 * and the integrations page are all reachable and render correctly.
 */

import { test, expect } from '@playwright/test'

// ── Public help center (no auth required) ──────────────────────────────────

test.describe('Public Help Center', () => {
  test('help landing page renders category cards', async ({ page }) => {
    await page.goto('/help', { waitUntil: 'domcontentloaded' })
    // Should not 404 or 500
    const title = page.locator('h1, h2').first()
    await expect(title).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=/getting started/i').first()).toBeVisible()
  })

  test('help category page renders articles list', async ({ page }) => {
    await page.goto('/help/getting-started', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
    // Should list at least one article
    await expect(page.locator('a').filter({ hasText: /sign up|overview|profile/i }).first()).toBeVisible()
  })

  test('help article page renders article content', async ({ page }) => {
    await page.goto('/help/getting-started/sign-up-create-organization', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
    // Article content should contain meaningful text
    await expect(page.locator('text=/organization/i').first()).toBeVisible()
  })

  test('public help search returns results', async ({ page }) => {
    await page.goto('/help/search?q=event', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
    // Search for "event" should surface at least one result
    await expect(page.locator('text=/event/i').first()).toBeVisible()
  })

  test('help article for integrations quick start is reachable', async ({ page }) => {
    await page.goto('/help/integrations/website-integration-quick-start', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=/tenant slug/i').first()).toBeVisible()
  })

  test('help article for api authentication is reachable', async ({ page }) => {
    await page.goto('/help/api/api-authentication', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=/api key/i').first()).toBeVisible()
  })

  test('help article for features/photo-gallery is reachable', async ({ page }) => {
    await page.goto('/help/features/photo-gallery', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=/album/i').first()).toBeVisible()
  })

  test('unknown help category returns 404 gracefully', async ({ page }) => {
    const response = await page.goto('/help/nonexistent-category', {
      waitUntil: 'domcontentloaded',
    })
    // Next.js returns 404 status for notFound() pages
    expect(response?.status()).toBe(404)
  })
})

// ── CORS preflight on embed endpoints ─────────────────────────────────────

test.describe('Embed API CORS', () => {
  test('newsletter endpoint accepts OPTIONS preflight', async ({ page }) => {
    const response = await page.request.fetch('/api/embed/newsletter', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.com' },
    })
    expect(response.status()).toBe(204)
    expect(response.headers()['access-control-allow-origin']).toBe('*')
  })

  test('events endpoint accepts OPTIONS preflight', async ({ page }) => {
    const response = await page.request.fetch('/api/embed/events', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.com' },
    })
    expect(response.status()).toBe(204)
    expect(response.headers()['access-control-allow-origin']).toBe('*')
  })

  test('course endpoint accepts OPTIONS preflight', async ({ page }) => {
    const response = await page.request.fetch('/api/embed/course', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.com' },
    })
    expect(response.status()).toBe(204)
    expect(response.headers()['access-control-allow-origin']).toBe('*')
  })
})

// ── Dashboard help (requires auth via storageState) ────────────────────────

test.describe('Dashboard Help Center', () => {
  test('dashboard help landing is reachable', async ({ page }) => {
    await page.goto('/dashboard/help', { waitUntil: 'domcontentloaded' })
    // Either renders the page or redirects to sign-in — no 500
    const url = page.url()
    const is404 = await page.locator('text=/404/').isVisible({ timeout: 2_000 }).catch(() => false)
    const is500 = await page.locator('text=/500/').isVisible({ timeout: 2_000 }).catch(() => false)
    expect(is404).toBeFalsy()
    expect(is500).toBeFalsy()
  })

  test('dashboard integrations page is reachable', async ({ page }) => {
    await page.goto('/dashboard/integrations', { waitUntil: 'domcontentloaded' })
    const is500 = await page.locator('text=/500 Internal/i').isVisible({ timeout: 2_000 }).catch(() => false)
    expect(is500).toBeFalsy()
  })
})
