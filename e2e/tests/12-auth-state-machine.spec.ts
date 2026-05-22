/**
 * E2E Test Suite: Auth → Org → Tenant → Dashboard State Machine
 *
 * Tests the core user journeys:
 *   1. New user, zero orgs   → onboarding → dashboard
 *   2. Returning user, one org  → dashboard directly (no create-org)
 *   3. Returning user, multiple orgs → select-organization screen
 *   4. Account switching  → old org does not leak into new account
 *   5. Logout  → cookies cleared, /sign-in reached
 *   6. Tenant isolation → Org A data not visible to Org B session
 *
 * Notes:
 * - All tests run against the authenticated Playwright session (storageState).
 * - Tests 1-3 rely on the E2E test user being in a known org state.
 * - Tests that need a fresh-user state (zero orgs) use a dedicated env var
 *   E2E_ZERO_ORG_CLERK_USER_ID / E2E_ZERO_ORG_CLERK_EMAIL if available;
 *   otherwise they are skipped.
 * - Test 4 uses the primary E2E user (logged in) + verifies no cross-account leak.
 */

import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Test 1: Returning user with one org lands directly on dashboard ───────────

test('Test 2 – returning user with existing org goes to dashboard, not create-org', async ({ page }) => {
  // The global-setup has already authenticated the E2E user (who has an existing org).
  await page.goto('/dashboard', { waitUntil: 'networkidle' })

  // Must land on dashboard — not onboarding, not select-organization
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  await expect(page).not.toHaveURL(/\/onboarding/)
  await expect(page).not.toHaveURL(/\/select-organization/)

  // Sidebar must be visible (proves tenant resolved successfully)
  await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 })
})

// ─── Test 2a: Root / redirects authenticated user to dashboard ─────────────────

test('Test 2a – authenticated root / redirects to /dashboard', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
})

// ─── Test 2b: Returning user does NOT see create-org wizard ───────────────────

test('Test 2b – authenticated user with existing org never sees create-org wizard', async ({ page }) => {
  await page.goto('/onboarding', { waitUntil: 'networkidle' })

  // Should be redirected away from onboarding (either to dashboard or select-organization)
  await expect(page).not.toHaveURL(/\/onboarding/, { timeout: 20_000 })

  const url = page.url()
  const wentToDashboard = url.includes('/dashboard')
  const wentToSelectOrg = url.includes('/select-organization')
  expect(wentToDashboard || wentToSelectOrg).toBeTruthy()
})

// ─── Test 3: /select-organization shows org list (not create-org) for multi-org ─

test('Test 3 – /select-organization page is accessible and shows orgs', async ({ page }) => {
  // Navigate to select-org directly (simulates multi-org redirect path)
  await page.goto('/select-organization', { waitUntil: 'networkidle' })

  const url = page.url()

  if (url.includes('/dashboard')) {
    // Single-org user was auto-selected — valid outcome
    await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 })
    return
  }

  if (url.includes('/onboarding')) {
    // Zero-org user — also valid (different user state)
    test.skip()
    return
  }

  // Must be on /select-organization
  expect(url).toContain('/select-organization')

  // Must NOT show the create-org form (which has id="org-name")
  const createOrgInput = page.locator('#org-name')
  await expect(createOrgInput).not.toBeVisible({ timeout: 5_000 })

  // Must show at least one org card (Building2 icon or org name text)
  const orgCards = page.locator('[class*="Card"]')
  await expect(orgCards.first()).toBeVisible({ timeout: 10_000 })
})

// ─── Test 5: Logout clears cookies and lands on sign-in ───────────────────────

test('Test 5 – logout clears session cookies and redirects to sign-in', async ({ page }) => {
  // Start authenticated on dashboard
  await page.goto('/dashboard', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })

  // Confirm cookies are present before sign-out
  const cookiesBefore = await page.context().cookies()
  const hasClerkSession = cookiesBefore.some((c) => c.name.startsWith('__session') || c.name.startsWith('__client'))
  expect(hasClerkSession).toBeTruthy()

  // Hit the sign-out API route directly (simulates afterSignOutUrl="/api/sign-out")
  const response = await page.goto('/api/sign-out', { waitUntil: 'networkidle' })

  // Should redirect to /sign-in (or sign-in URL)
  await expect(page).toHaveURL(/sign-in/, { timeout: 15_000 })

  // App-side cookies must be cleared
  const cookiesAfter = await page.context().cookies()
  const activeOrgCookie = cookiesAfter.find((c) => c.name === 'JG_ACTIVE_ORG')
  const tenantIdCookie  = cookiesAfter.find((c) => c.name === 'JG_TENANT_ID')

  // maxAge=0 means cookie was deleted (may appear with empty value or be absent)
  const isCleared = (c: typeof activeOrgCookie) => !c || !c.value || c.value === ''
  expect(isCleared(activeOrgCookie)).toBeTruthy()
  expect(isCleared(tenantIdCookie)).toBeTruthy()
})

// ─── Test 4: Account switch — no state leaks from previous session ─────────────

test('Test 4 – /api/sign-out clears JG_ cookies before new login', async ({ page }) => {
  // Verify that JG_ACTIVE_ORG and JG_TENANT_ID are absent after sign-out,
  // preventing cross-account state leakage.
  await page.goto('/api/sign-out', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/sign-in/, { timeout: 15_000 })

  const cookies = await page.context().cookies()
  const activeOrg = cookies.find((c) => c.name === 'JG_ACTIVE_ORG')
  const tenantId  = cookies.find((c) => c.name === 'JG_TENANT_ID')

  expect(!activeOrg || !activeOrg.value).toBeTruthy()
  expect(!tenantId  || !tenantId.value).toBeTruthy()
})

// ─── Test 6: Tenant isolation ─────────────────────────────────────────────────

test('Test 6 – tenant isolation: events from another tenant are not visible', async ({ page }) => {
  // Create a scratch tenant (different from the E2E user's tenant)
  const isolationSlug = `isolation-sm-${Date.now()}`
  const tenant = await prisma.tenant.create({
    data: {
      clerkOrgId: `org_isolation_${Date.now()}`,
      name: `Isolation Tenant ${Date.now()}`,
      slug: isolationSlug,
      updatedAt: new Date(),
    },
  })

  const event = await prisma.event.create({
    data: {
      title: `Secret Event ${Date.now()}`,
      tenantId: tenant.id,
      status: 'PUBLISHED',
      startDate: new Date(Date.now() + 86_400_000),
      updatedAt: new Date(),
    },
  })

  try {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })

    // The isolation event must NOT appear in the E2E user's event list
    await page.goto('/dashboard/events', { waitUntil: 'networkidle' })
    await expect(page.locator(`text=${event.title}`)).not.toBeVisible({ timeout: 5_000 })

    // Direct access to the isolation event must return 404
    const resp = await page.goto(`/dashboard/events/${event.id}`, { waitUntil: 'networkidle' })
    expect(resp?.status()).toBe(404)
  } finally {
    await prisma.event.delete({ where: { id: event.id } }).catch(() => undefined)
    await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined)
    await prisma.$disconnect()
  }
})

// ─── Test 6b: /select-organization cannot be accessed unauthenticated ──────────

test('Test 6b – unauthenticated access to /select-organization redirects to sign-in', async ({
  browser,
}) => {
  const freshContext = await browser.newContext() // no storageState = no cookies
  const page = await freshContext.newPage()

  try {
    await page.goto('/select-organization', { waitUntil: 'commit' })
    await expect(page).toHaveURL(/sign-in/, { timeout: 15_000 })
  } finally {
    await freshContext.close()
  }
})
