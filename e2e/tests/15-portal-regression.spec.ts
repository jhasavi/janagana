import { test, expect, type Page } from '@playwright/test'
import {
  readE2EFixtureRecord,
  seedE2EFixtures,
  type E2EFixtureRecord,
} from '../test-auth-fixtures'

const APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.TENANT_APP_BASE_URL || 'http://localhost:3000'

let fixtureRecordPromise: ReturnType<typeof seedE2EFixtures> | null = null

async function getFixtureRecord() {
  const existing = await readE2EFixtureRecord()
  if (existing) {
    await fetch(`${APP_BASE_URL.replace(/\/$/, '')}/api/test-auth/reset`, { method: 'POST' }).catch(() => undefined)
    return existing
  }
  if (!fixtureRecordPromise) {
    fixtureRecordPromise = seedE2EFixtures()
  }
  const record = await fixtureRecordPromise
  await fetch(`${APP_BASE_URL.replace(/\/$/, '')}/api/test-auth/reset`, { method: 'POST' }).catch(() => undefined)
  return record
}

async function signInAs(page: Page, fixture: E2EFixtureRecord) {
  await page.context().clearCookies()
  await page.context().addCookies([
    {
      name: 'JG_TEST_AUTH',
      value: encodeURIComponent(JSON.stringify({ userId: fixture.userId, email: fixture.email })),
      url: APP_BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
      secure: APP_BASE_URL.startsWith('https://'),
    },
  ])
}

// ─── Test 1: Public portal landing ───────────────────────────────────────────

test('portal landing page does not crash and shows org or no-membership state', async ({ page }) => {
  const fixtures = await getFixtureRecord()
  await signInAs(page, fixtures.userB)

  const response = await page.goto('/portal/e2e-org-b', { waitUntil: 'networkidle' })

  // Must not be a server error
  expect(response?.status()).not.toBe(500)

  // Must not show a generic crash screen
  await expect(page.locator('body')).not.toContainText('Application error')
  await expect(page.locator('body')).not.toContainText('Internal Server Error')

  // Either shows org name (member found) or a clear unavailability message
  const hasOrgName = await page.locator('body').filter({ hasText: 'E2E Org B' }).count() > 0
  const hasNoMembership = await page.locator('body').filter({ hasText: /No membership found|not linked|not a member/i }).count() > 0
  const hasPortalContent = await page.locator('body').filter({ hasText: /Member Portal|My Profile|profile/i }).count() > 0

  expect(hasOrgName || hasNoMembership || hasPortalContent).toBe(true)
})

// ─── Test 2: Portal donations page ───────────────────────────────────────────

test('portal donations page does not crash', async ({ page }) => {
  const fixtures = await getFixtureRecord()
  await signInAs(page, fixtures.userB)

  const response = await page.goto('/portal/e2e-org-b/donations', { waitUntil: 'networkidle' })

  expect(response?.status()).not.toBe(500)
  await expect(page.locator('body')).not.toContainText('Application error')
  await expect(page.locator('body')).not.toContainText('Internal Server Error')

  // Shows donation history section or empty state or no-membership fallback
  const hasContent = await page.locator('body').filter({ hasText: /Giving history|No donations|donation|No membership found/i }).count() > 0
  expect(hasContent).toBe(true)
})

// ─── Test 3: Portal events page ──────────────────────────────────────────────

test('portal events page does not crash and shows events or empty state', async ({ page }) => {
  const fixtures = await getFixtureRecord()
  await signInAs(page, fixtures.userB)

  const response = await page.goto('/portal/e2e-org-b/events', { waitUntil: 'networkidle' })

  expect(response?.status()).not.toBe(500)
  await expect(page.locator('body')).not.toContainText('Application error')
  await expect(page.locator('body')).not.toContainText('Internal Server Error')

  // Should show either events (our seeded E2E Test Event) or an empty state or no-membership
  const hasContent = await page.locator('body').filter({ hasText: /Upcoming Events|E2E Test Event|No events|No membership found/i }).count() > 0
  expect(hasContent).toBe(true)
})

// ─── Test 4: Invalid portal slug ─────────────────────────────────────────────

test('invalid portal slug returns 404 or not-found state without crashing', async ({ page }) => {
  const fixtures = await getFixtureRecord()
  await signInAs(page, fixtures.userB)

  const response = await page.goto('/portal/not-a-real-org-xyz-9999', { waitUntil: 'networkidle' })

  // Must not be a 500 server crash
  expect(response?.status()).not.toBe(500)
  await expect(page.locator('body')).not.toContainText('Application error')
  await expect(page.locator('body')).not.toContainText('Internal Server Error')

  // Should be a 404 or a graceful "no membership" message
  const is404 = response?.status() === 404
  const hasNotFound = await page.locator('body').filter({ hasText: /not found|404|No membership found/i }).count() > 0
  expect(is404 || hasNotFound).toBe(true)
})

// ─── Test 5: Admin active org does not leak into portal ──────────────────────

test('portal resolves org by URL slug not by active dashboard org cookie', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  // Sign in as user A (belongs to e2e-org-a)
  await signInAs(page, fixtures.userA)

  // Set active org cookie to e2e-org-a (as if user A selected their dashboard org)
  await page.context().addCookies([
    {
      name: 'JG_ACTIVE_ORG',
      value: fixtures.userA.orgIds[0],
      url: APP_BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
      secure: APP_BASE_URL.startsWith('https://'),
    },
  ])

  // Visit org-B portal while org-A is the active dashboard org
  const response = await page.goto('/portal/e2e-org-b', { waitUntil: 'networkidle' })

  // Must not crash
  expect(response?.status()).not.toBe(500)
  await expect(page.locator('body')).not.toContainText('Application error')

  // Must NOT show org-A name in the portal header (portal resolved org-b by slug)
  await expect(page.locator('body')).not.toContainText('E2E Org A')

  // Should show either "No membership found" (user A has no member in org-b) or org-b content
  const hasOrgBOrNoMembership = await page.locator('body').filter({ hasText: /E2E Org B|No membership found/i }).count() > 0
  expect(hasOrgBOrNoMembership).toBe(true)
})

// ─── Test 6: Member-only portal without auth ─────────────────────────────────

test('portal without auth redirects to sign-in instead of crashing', async ({ page }) => {
  // No auth cookie at all
  await page.context().clearCookies()

  const response = await page.goto('/portal/e2e-org-b', { waitUntil: 'networkidle' })

  // Must not crash
  expect(response?.status()).not.toBe(500)
  await expect(page.locator('body')).not.toContainText('Application error')
  await expect(page.locator('body')).not.toContainText('Internal Server Error')

  // Must end up at sign-in (middleware redirected unauthenticated user)
  expect(page.url()).toMatch(/\/sign-in/)
})
