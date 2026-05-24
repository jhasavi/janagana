import { test, expect, type Page } from '@playwright/test'
import {
  readE2EFixtureRecord,
  seedE2EFixtures,
} from '../test-auth-fixtures'

let fixtureRecordPromise: ReturnType<typeof seedE2EFixtures> | null = null
const APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.TENANT_APP_BASE_URL || 'http://localhost:3000'

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

test('select organization page shows identity, supports sign-out, and has actionable controls', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userC.userId, fixtures.userC.email)
  await page.goto('/select-organization', { waitUntil: 'networkidle' })

  await expect(page.getByTestId('signed-in-user-identity')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('signed-in-user-identity')).toContainText('e2e-user-c@example.com')

  const orgCards = page.getByTestId('organization-card')
  await expect(orgCards).toHaveCount(2)

  await expect(page.getByTestId('create-organization-cta')).toBeVisible()
  await page.getByTestId('create-organization-cta').click()
  await page.waitForURL(/\/onboarding/, { timeout: 30_000 })

  await page.goto('/select-organization', { waitUntil: 'networkidle' })
  await page.getByTestId('select-org-button').first().click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })

  await page.goto('/select-organization', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('select-org-sign-out')).toBeVisible()
  await page.getByTestId('select-org-sign-out').click()
  await page.waitForURL(/\/sign-in/, { timeout: 30_000 })
})

test('dashboard primary CTAs are actionable', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)
  await goDashboard(page)

  await page.getByRole('link', { name: /add tier/i }).first().click()
  await page.waitForURL(/\/dashboard\/tiers\/new/, { timeout: 30_000 })

  await goDashboard(page)
  await page.getByRole('link', { name: /add member/i }).first().click()
  await page.waitForURL(/\/dashboard\/members\/new/, { timeout: 30_000 })

  await goDashboard(page)
  await page.getByRole('link', { name: /new event/i }).first().click()
  await page.waitForURL(/\/dashboard\/events\/new/, { timeout: 30_000 })
})

test('launch center action buttons navigate to concrete routes', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)
  await goDashboard(page)

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
    const trigger = page.getByTestId(`launch-center-cta-${cta.id}`)
    await expect(trigger).toBeVisible({ timeout: 20_000 })
    await trigger.click()
    await page.waitForURL(cta.expectedUrl, { timeout: 30_000 })
    await expect(page.getByText('Dashboard failed to load')).toHaveCount(0)
  }
})

test('sidebar links navigate without dashboard crash', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)

  const sidebarTargets: Array<{ label: string; route: RegExp }> = [
    { label: 'Dashboard', route: /\/dashboard$/ },
    { label: 'Analytics', route: /\/dashboard\/analytics/ },
    { label: 'Contacts', route: /\/dashboard\/crm$/ },
    { label: 'Companies', route: /\/dashboard\/crm\/companies/ },
    { label: 'Deals', route: /\/dashboard\/crm\/deals/ },
    { label: 'Tasks', route: /\/dashboard\/crm\/tasks/ },
    { label: 'Memberships', route: /\/dashboard\/members/ },
    { label: 'Events', route: /\/dashboard\/events/ },
    { label: 'Fundraising', route: /\/dashboard\/fundraising/ },
    { label: 'Volunteering', route: /\/dashboard\/volunteers/ },
    { label: 'Communications', route: /\/dashboard\/communications/ },
    { label: 'Integrations', route: /\/dashboard\/integrations/ },
    { label: 'Organization Console', route: /\/dashboard\/settings\/organization-console/ },
    { label: 'Settings', route: /\/dashboard\/settings/ },
  ]

  for (const target of sidebarTargets) {
    await goDashboard(page)
    await page.getByRole('link', { name: new RegExp(`^${target.label}$`, 'i') }).first().click()
    await page.waitForURL(target.route, { timeout: 30_000 })
    await expect(page.getByText('Dashboard failed to load')).toHaveCount(0)
  }
})

test('dashboard analytics route does not show generic crash shell', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)
  await page.goto('/dashboard/analytics', { waitUntil: 'networkidle' })

  await expect(page).toHaveURL(/\/dashboard\/analytics/, { timeout: 30_000 })
  await expect(page.getByText('Dashboard failed to load')).toHaveCount(0)
  await expect(page.getByText('An error occurred in the Server Components render')).toHaveCount(0)

  const analyticsHeader = page.getByRole('heading', { name: /analytics/i }).first()
  const fallback = page.getByTestId('analytics-fallback')
  await expect(analyticsHeader.or(fallback)).toBeVisible({ timeout: 20_000 })
})

test('no-op actionability detector finds no obvious fake clickable controls on dashboard', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)
  await goDashboard(page)

  const report = await page.evaluate(() => {
    const isVisible = (el: Element) => {
      const htmlEl = el as HTMLElement
      const style = window.getComputedStyle(htmlEl)
      return style.display !== 'none' && style.visibility !== 'hidden' && htmlEl.getClientRects().length > 0
    }

    const selectorFor = (el: Element) => {
      const htmlEl = el as HTMLElement
      const id = htmlEl.id ? `#${htmlEl.id}` : ''
      const testId = htmlEl.getAttribute('data-testid')
      if (testId) return `[data-testid="${testId}"]`
      const cls = (htmlEl.className || '').toString().trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.')
      return `${htmlEl.tagName.toLowerCase()}${id}${cls ? `.${cls}` : ''}`
    }

    const root = document.querySelector('main')
    if (!root) return { entries: [], obviousNoops: [] }

    const candidates = Array.from(root.querySelectorAll('a, button, [role="button"]')).filter(isVisible)

    const entries = candidates.map((node) => {
      const el = node as HTMLElement
      const label = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')
      const href = el instanceof HTMLAnchorElement ? el.getAttribute('href') : null
      const disabled = el.getAttribute('disabled') !== null || el.getAttribute('aria-disabled') === 'true'
      const hasHref = Boolean(href && href !== '#' && !href.startsWith('javascript:'))

      return {
        label,
        selector: selectorFor(el),
        href,
        disabled,
        hasHref,
      }
    })

    const obviousNoops = entries.filter((entry) => {
      if (entry.disabled) return false
      if (entry.hasHref) return false
      // Buttons with no href are common in React, so only flag empty-label items.
      return !entry.label
    })

    return { entries, obviousNoops }
  })

  await test.info().attach('dashboard-actionability-report.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  })

  expect(report.obviousNoops).toEqual([])
})
