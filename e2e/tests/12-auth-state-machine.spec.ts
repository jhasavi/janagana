import { test, expect, type Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import {
  readE2EFixtureRecord,
  seedE2EFixtures,
} from '../test-auth-fixtures'

const prisma = new PrismaClient()

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

async function openRoot(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForURL(/\/(dashboard|onboarding|select-organization)/, { timeout: 30_000 })
}

async function signOut(page: Page) {
  await page.goto('/api/sign-out', { waitUntil: 'networkidle' })
  await page.waitForURL(/\/sign-in/, { timeout: 30_000 })
}

async function expectSidebarOrgName(page: Page, orgName: string) {
  const sidebarBrand = page.locator('aside a[href="/dashboard"] span').first()
  await expect(sidebarBrand).toHaveText(orgName, { timeout: 20_000 })
}

async function selectOrgViaUI(page: Page, orgName: string) {
  await page.goto('/select-organization', { waitUntil: 'networkidle' })
  const card = page.locator('[data-testid="organization-card"]').filter({ hasText: orgName }).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  await card.click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

async function completeOnboarding(page: Page, orgName: string) {
  await expect(page.locator('#org-name')).toBeVisible({ timeout: 20_000 })
  await page.locator('#org-name').fill(orgName)
  await page.locator('button[type="submit"]:not([disabled])').click()

  const reachedAfterProfile = await Promise.race<"dashboard" | "tier">([
    page.waitForURL(/\/dashboard/, { timeout: 30_000 }).then(() => 'dashboard' as const),
    expect(page.locator('#tier-name')).toBeVisible({ timeout: 60_000 }).then(() => 'tier' as const),
  ])

  if (reachedAfterProfile === 'dashboard') {
    return
  }

  await page.locator('#tier-name').fill('E2E Member')
  await page.locator('button:has-text("Save & Continue")').click()

  await expect(page.locator('text=Your public entry points')).toBeVisible({ timeout: 20_000 })
  await page.locator('button:has-text("Continue")').click()

  await expect(page.locator('#m-first')).toBeVisible({ timeout: 20_000 })
  await page.locator('#m-first').fill('Jane')
  await page.locator('#m-last').fill('Doe')
  await page.locator('#m-email').fill(`e2e+${Date.now()}@example.com`)
  await page.locator('button:has-text("Add Member")').click()

  await expect(page.locator('#ev-title')).toBeVisible({ timeout: 20_000 })
  await page.locator('#ev-title').fill('E2E Kickoff')
  const eventDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
  await page.locator('#ev-date').fill(eventDate)
  await page.locator('button:has-text("Create Event")').click()

  await expect(page.locator('text=You\'re all set!')).toBeVisible({ timeout: 20_000 })
  await page.locator('button:has-text("Go to Dashboard")').click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

test('returning user with existing org goes to dashboard, not create-org', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)
  await openRoot(page)

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  await expect(page).not.toHaveURL(/\/onboarding/)
  await expect(page).not.toHaveURL(/\/select-organization/)
  await expectSidebarOrgName(page, 'E2E Org B')

  await signOut(page)

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)
  await openRoot(page)

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  await expect(page).not.toHaveURL(/\/onboarding/)
  await expectSidebarOrgName(page, 'E2E Org B')
})

test('multi-org user can select Org C1 and Org C2 without data leakage', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  const orgC1TenantId = fixtures.userC.tenantIds[0]
  const orgC2TenantId = fixtures.userC.tenantIds[1]

  const c1Event = await prisma.event.create({
    data: {
      tenantId: orgC1TenantId,
      title: `E2E C1 Event ${Date.now()}`,
      status: 'PUBLISHED',
      startDate: new Date(Date.now() + 86_400_000),
      updatedAt: new Date(),
    },
  })

  const c2Event = await prisma.event.create({
    data: {
      tenantId: orgC2TenantId,
      title: `E2E C2 Event ${Date.now()}`,
      status: 'PUBLISHED',
      startDate: new Date(Date.now() + 86_400_000),
      updatedAt: new Date(),
    },
  })

  try {
    await signInAs(page, fixtures.userC.userId, fixtures.userC.email)
    await openRoot(page)

    await expect(page).toHaveURL(/\/select-organization/, { timeout: 30_000 })
    await expect(page.getByText('E2E Org C1')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('E2E Org C2')).toBeVisible({ timeout: 20_000 })

    await selectOrgViaUI(page, 'E2E Org C1')
    await expectSidebarOrgName(page, 'E2E Org C1')

    await page.goto('/dashboard/events', { waitUntil: 'networkidle' })
    const c1VisibleResponse = await page.goto(`/dashboard/events/${c1Event.id}`, { waitUntil: 'networkidle' })
    expect(c1VisibleResponse?.status()).toBe(200)
    const c2HiddenResponse = await page.goto(`/dashboard/events/${c2Event.id}`, { waitUntil: 'networkidle' })
    expect(c2HiddenResponse?.status()).toBe(404)

    await selectOrgViaUI(page, 'E2E Org C2')
    await expectSidebarOrgName(page, 'E2E Org C2')

    await page.goto('/dashboard/events', { waitUntil: 'networkidle' })
    const c1HiddenResponse = await page.goto(`/dashboard/events/${c1Event.id}`, { waitUntil: 'networkidle' })
    expect(c1HiddenResponse?.status()).toBe(404)
  } finally {
    await prisma.event.delete({ where: { id: c1Event.id } }).catch(() => undefined)
    await prisma.event.delete({ where: { id: c2Event.id } }).catch(() => undefined)
  }
})

test('account switching clears old org cookies and loads the new user org', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  await signInAs(page, fixtures.userA.userId, fixtures.userA.email)
  await openRoot(page)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  await expectSidebarOrgName(page, 'E2E Org A')

  await signOut(page)

  const cookiesAfterLogout = await page.context().cookies()
  expect(cookiesAfterLogout.find((cookie) => cookie.name === 'JG_ACTIVE_ORG')).toBeUndefined()
  expect(cookiesAfterLogout.find((cookie) => cookie.name === 'JG_TENANT_ID')).toBeUndefined()

  await signInAs(page, fixtures.userB.userId, fixtures.userB.email)
  await openRoot(page)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  await expectSidebarOrgName(page, 'E2E Org B')
})

test('zero-org onboarding creates tenant and reaches dashboard', async ({ page }) => {
  const fixtures = await getFixtureRecord()
  const orgName = `E2E New Org ${Date.now()}`

  await signInAs(page, fixtures.userD.userId, fixtures.userD.email)
  await openRoot(page)

  await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 })
  await completeOnboarding(page, orgName)
  await expectSidebarOrgName(page, orgName)

  await signOut(page)
})

test('tenant isolation blocks cross-tenant event access', async ({ page }) => {
  const fixtures = await getFixtureRecord()

  const tenantA = fixtures.userA.tenantIds[0]
  const tenantB = fixtures.userB.tenantIds[0]

  const eventA = await prisma.event.create({
    data: {
      tenantId: tenantA,
      title: `Isolation Event A ${Date.now()}`,
      status: 'PUBLISHED',
      startDate: new Date(Date.now() + 86_400_000),
      updatedAt: new Date(),
    },
  })

  const eventB = await prisma.event.create({
    data: {
      tenantId: tenantB,
      title: `Isolation Event B ${Date.now()}`,
      status: 'PUBLISHED',
      startDate: new Date(Date.now() + 86_400_000),
      updatedAt: new Date(),
    },
  })

  try {
    await signInAs(page, fixtures.userA.userId, fixtures.userA.email)
    await openRoot(page)
    await expectSidebarOrgName(page, 'E2E Org A')

    await page.goto('/dashboard/events', { waitUntil: 'networkidle' })
    await expect(page.getByText(eventA.title)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(eventB.title)).not.toBeVisible({ timeout: 5_000 })

    const response = await page.goto(`/dashboard/events/${eventB.id}`, { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(404)
  } finally {
    await prisma.event.delete({ where: { id: eventA.id } }).catch(() => undefined)
    await prisma.event.delete({ where: { id: eventB.id } }).catch(() => undefined)
  }
})
