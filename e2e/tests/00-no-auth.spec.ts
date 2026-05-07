/**
 * E2E Test: No-Auth Public Routes
 * Tests that unauthenticated users are handled correctly.
 * These tests do NOT require Clerk login.
 */

import { test, expect } from '@playwright/test'

const signInPathRaw = process.env.E2E_SIGN_IN_PATH || process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth/login'
const signInPath = signInPathRaw.startsWith('/') ? signInPathRaw : `/${signInPathRaw}`
const escapedSignInPath = signInPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const signInPathRegex = new RegExp(escapedSignInPath)

test.describe('Public route behaviour (no auth)', () => {
  test('root redirect: / is accessible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' })
    // Should redirect to sign-in or show landing — not 500
    await page.waitForURL(new RegExp(`${escapedSignInPath}|/$`), { timeout: 10_000 })
    const has500 = await page.locator('text=/500 Internal/i').isVisible({ timeout: 2_000 }).catch(() => false)
    expect(has500).toBeFalsy()
  })

  test('sign-in page is publicly accessible', async ({ page }) => {
    await page.goto(signInPath, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    const url = page.url()
    const isAuthPage = url.includes(signInPath) || url.includes('clerk.') || url.includes('accounts.')
    expect(isAuthPage).toBeTruthy()
  })

  test('sign-up page is publicly accessible', async ({ page }) => {
    await page.goto('/sign-up', { waitUntil: 'domcontentloaded', timeout: 15_000 })
    const url = page.url()
    const isAuthPage = url.includes('/sign-up') || url.includes('clerk.') || url.includes('accounts.')
    expect(isAuthPage).toBeTruthy()
  })

  test('/dashboard redirects unauthenticated user to sign-in', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'commit' })
    await expect(page).toHaveURL(signInPathRegex, { timeout: 10_000 })
  })

  test('/dashboard/members redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard/members', { waitUntil: 'commit' })
    await expect(page).toHaveURL(signInPathRegex, { timeout: 10_000 })
  })

  test('/onboarding redirects unauthenticated user', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'commit' })
    await expect(page).toHaveURL(signInPathRegex, { timeout: 10_000 })
  })

  test('webhook endpoint returns non-200 for GET', async ({ page }) => {
    const response = await page.request.get('/api/webhooks/stripe')
    expect([400, 405, 500]).toContain(response.status())
  })
})
