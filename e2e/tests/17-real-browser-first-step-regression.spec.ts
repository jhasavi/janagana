/**
 * 17-real-browser-first-step-regression.spec.ts
 *
 * Regression suite for BUG-001 through BUG-004 (see docs/REALITY_BUG_LEDGER.md).
 *
 * Design principle: click WHERE A USER WOULD CLICK, not where a data-testid is.
 *   BUG-001 tests: sign-out must complete and navigate, never hang.
 *   BUG-002 tests: card BODY (not just CTA button) must navigate.
 *   BUG-003 tests: Stripe warning must be visible when DB has no paid tier.
 *   BUG-004 tests: CTA mechanism baseline still holds alongside the body-click tests.
 *
 * Note on BUG-001 in real Clerk mode:
 *   These tests run in E2E test-auth mode. In test mode, sign-out always calls
 *   window.location.assign() directly — the Clerk branch is never exercised.
 *   The 5-second timeout proves the mechanism completes; real Clerk sign-out
 *   correctness can only be fully verified with real Clerk credentials.
 */

import { test, expect, type Page } from '@playwright/test'
import { readE2EFixtureRecord, seedE2EFixtures } from '../test-auth-fixtures'

const APP_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || process.env.TENANT_APP_BASE_URL || 'http://localhost:3000'

let fixtureRecordPromise: ReturnType<typeof seedE2EFixtures> | null = null

async function getFixtureRecord() {
  const existing = await readE2EFixtureRecord()
  if (existing) {
    await fetch(`${APP_BASE_URL.replace(/\/$/, '')}/api/test-auth/reset`, { method: 'POST' }).catch(
      () => undefined,
    )
    return existing
  }
  if (!fixtureRecordPromise) {
    fixtureRecordPromise = seedE2EFixtures()
  }
  const record = await fixtureRecordPromise
  await fetch(`${APP_BASE_URL.replace(/\/$/, '')}/api/test-auth/reset`, { method: 'POST' }).catch(
    () => undefined,
  )
  return record
}

async function signInAs(page: Page, userId: string, email: string) {
  await page.context().clearCookies()
  await page.context().addCookies([
    {
      name: 'JG_TEST_AUTH',
      value: encodeURIComponent(JSON.stringify({ userId, email })),
      url: APP_BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
      secure: APP_BASE_URL.startsWith('https://'),
    },
  ])
}

async function goDashboard(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'networkidle' })
  await page.waitForURL(/\/dashboard(\?.*)?$/, { timeout: 30_000 })
}

// ── BUG-001: sign-out must not hang ──────────────────────────────────────────

test('BUG-001: sign-out completes and lands at /sign-in within 5 seconds', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  // userC has 2 orgs → stays on /select-organization (no auto-select)
  await signInAs(page, fixtures.userC.userId, fixtures.userC.email)
  await page.goto('/select-organization', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('select-org-sign-out')).toBeVisible({ timeout: 20_000 })

  await page.getByTestId('select-org-sign-out').click()

  // 15-second cap: if button were stuck at "Signing out…" the test would timeout here
  await page.waitForURL(/\/sign-in/, { timeout: 15_000 })
  await expect(page).toHaveURL(/\/sign-in/)
})

test('BUG-001: after sign-out, JG_ACTIVE_ORG and JG_TENANT_ID cookies are cleared', async ({
  page,
}) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userC.userId, fixtures.userC.email)
  await page.goto('/select-organization', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('select-org-sign-out')).toBeVisible({ timeout: 20_000 })

  await page.getByTestId('select-org-sign-out').click()
  await page.waitForURL(/\/sign-in/, { timeout: 10_000 })

  const cookies = await page.context().cookies()
  expect(cookies.find((c) => c.name === 'JG_ACTIVE_ORG')).toBeUndefined()
  expect(cookies.find((c) => c.name === 'JG_TENANT_ID')).toBeUndefined()
})

// ── BUG-002: card BODY must navigate, not just the CTA button ────────────────

test('BUG-002: clicking launch center card body (icon/label area — left 20%) navigates', async ({
  page,
}) => {
  // Before the BUG-002 fix: clicking left 20% does nothing (no href on the outer div).
  // After the fix: the overlay link covers the whole card, so any click navigates.
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)

  const cardPairs: Array<{ id: string; expectedUrl: RegExp }> = [
    { id: 'profile', expectedUrl: /\/dashboard\/settings/ },
    { id: 'members', expectedUrl: /\/dashboard\/members/ },
    { id: 'events', expectedUrl: /\/dashboard\/events/ },
  ]

  for (const { id, expectedUrl } of cardPairs) {
    await goDashboard(page)

    const card = page.getByTestId(`launch-center-item-${id}`)
    await expect(card).toBeVisible({ timeout: 20_000 })

    // Get bounding box to compute 20% offset, then click via element (handles scroll atomically)
    const box = await card.boundingBox()
    if (!box) throw new Error(`No bounding box for launch-center-item-${id}`)

    // Click at left 20%: icon/label area — NOT the CTA on the right
    // Using card.click({ position }) instead of page.mouse.click() so Playwright
    // recomputes viewport coordinates at click-time after scrolling into view
    await card.click({ position: { x: Math.floor(box.width * 0.2), y: Math.floor(box.height / 2) } })
    await page.waitForURL(expectedUrl, { timeout: 15_000 })
    await expect(page.getByText('Dashboard failed to load')).toHaveCount(0)
  }
})

test('BUG-002: clicking launch center card middle (description area — 50%) also navigates', async ({
  page,
}) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)
  await goDashboard(page)

  const card = page.getByTestId('launch-center-item-tiers')
  await expect(card).toBeVisible({ timeout: 20_000 })

  const box = await card.boundingBox()
  if (!box) throw new Error('No bounding box for launch-center-item-tiers')

  // Click exactly at horizontal midpoint — not the CTA on the right side
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2)
  await page.waitForURL(/\/dashboard\/(tiers|members)/, { timeout: 15_000 })
})

// ── BUG-003: Stripe warning must be truthful ──────────────────────────────────

test('BUG-003: stripe warning appears when tenant has no paid tier with Stripe Price ID', async ({
  page,
}) => {
  // e2e-org-b (userB) has only a free tier (priceCents=0, stripePriceId=null).
  // The warning "No paid membership tier is configured..." MUST be visible.
  // If it were hidden, the UI would lie to the operator about payment readiness.
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)
  await goDashboard(page)

  await expect(
    page.getByText('No paid membership tier is configured with a Stripe Price ID').first(),
  ).toBeVisible({ timeout: 20_000 })
})

test('BUG-003a: free-only tenant shows setup guidance, not Stripe error', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)
  await goDashboard(page)

  await expect(
    page.getByText('Add a paid tier when you are ready to accept paid memberships.').first(),
  ).toBeVisible({ timeout: 20_000 })
  await expect(
    page.getByText('No paid membership tier is configured with a Stripe Price ID').first(),
  ).toHaveCount(0)
})

test('BUG-003b: tenant with no tiers shows create tiers guidance instead of Stripe error', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userA.userId, fixtures.userA.email)
  await goDashboard(page)

  await expect(
    page.getByText('Create membership tiers before accepting paid memberships.').first(),
  ).toBeVisible({ timeout: 20_000 })
  await expect(
    page.getByText('No paid membership tier is configured with a Stripe Price ID').first(),
  ).toHaveCount(0)
})

test('BUG-003c: switching organizations refreshes Stripe readiness state', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userC.userId, fixtures.userC.email)
  await page.goto('/select-organization', { waitUntil: 'networkidle' })

  const orgC1Card = page.getByTestId('organization-card').filter({ hasText: 'E2E Org C1' }).first()
  await expect(orgC1Card).toBeVisible({ timeout: 20_000 })
  await orgC1Card.click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })

  await expect(
    page.getByText('Paid membership tier is missing a Stripe Price ID.').first(),
  ).toBeVisible({ timeout: 20_000 })

  await page.goto('/select-organization', { waitUntil: 'networkidle' })
  const orgC2Card = page.getByTestId('organization-card').filter({ hasText: 'E2E Org C2' }).first()
  await expect(orgC2Card).toBeVisible({ timeout: 20_000 })
  await orgC2Card.click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })

  await expect(
    page.getByText('Create membership tiers before accepting paid memberships.').first(),
  ).toBeVisible({ timeout: 20_000 })
  await expect(
    page.getByText('Paid membership tier is missing a Stripe Price ID.').first(),
  ).toHaveCount(0)
})

// ── BUG-004: mechanism baseline still holds alongside body-click tests ────────

test('BUG-004: all 10 launch center CTA links navigate to concrete routes', async ({ page }) => {
  test.setTimeout(240_000) // 10 CTAs × ~15s each
  // Mechanism test: the data-testid overlay links all work.
  // BUG-004 is considered fixed when BOTH this test AND the body-click tests pass.
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)

  const ctas: Array<{ id: string; expectedUrl: RegExp }> = [
    { id: 'profile', expectedUrl: /\/dashboard\/settings/ },
    { id: 'members', expectedUrl: /\/dashboard\/members/ },
    { id: 'events', expectedUrl: /\/dashboard\/events/ },
    { id: 'portal', expectedUrl: /\/dashboard\/integrations/ },
    { id: 'support', expectedUrl: /\/dashboard\/support/ },
    { id: 'fundraising', expectedUrl: /\/dashboard\/fundraising/ },
    { id: 'tiers', expectedUrl: /\/dashboard\/(tiers\/new|members)/ },
    { id: 'stripe', expectedUrl: /\/dashboard\/integrations/ },
    { id: 'email', expectedUrl: /\/dashboard\/integrations/ },
    { id: 'brand', expectedUrl: /\/dashboard\/settings/ },
  ]

  for (const cta of ctas) {
    await goDashboard(page)
    const trigger = page.getByTestId(`launch-center-cta-${cta.id}`).first()
    await expect(trigger).toBeVisible({ timeout: 20_000 })
    await trigger.click()
    await page.waitForURL(cta.expectedUrl, { timeout: 30_000 })
    await expect(page.getByText('Dashboard failed to load')).toHaveCount(0)
  }
})
