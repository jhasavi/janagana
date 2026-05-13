/**
 * Global E2E Setup — Email/Password Form-Fill Auth
 *
 * Signs in via the Clerk sign-in form using email + password (form-fill).
 * This approach is more reliable than sign-in tokens which can fail to
 * establish a persistent session in some Clerk configurations.
 *
 * Required env vars (.env):
 *   E2E_CLERK_EMAIL    — email of a Clerk user in your project
 *   E2E_CLERK_PASSWORD — password for the test user
 *   CLERK_SECRET_KEY   — already required for the app itself
 * Optional env vars (.env):
 *   E2E_SIGN_IN_PATH    — explicit app sign-in route (defaults to /auth/login)
 */

import { test as setup, expect } from '@playwright/test'
import { createClerkClient } from '@clerk/backend'
import path from 'path'
import fs from 'fs'
import { prisma } from '@/lib/prisma'

const STORAGE_STATE = path.join(__dirname, '..', '.auth', 'user.json')
const GOOGLE_OAUTH_URL = /accounts\.google\.com/

setup('authenticate via email/password form fill', async ({ page }) => {
  const email = process.env.E2E_CLERK_EMAIL
  const password = process.env.E2E_CLERK_PASSWORD
  const secretKey = process.env.CLERK_SECRET_KEY
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || process.env.TENANT_APP_BASE_URL || 'http://localhost:3000'
  const signInPath = process.env.E2E_SIGN_IN_PATH || process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'
  const forceSetup = process.env.E2E_FORCE_AUTH_SETUP === 'true'

  if (!email) throw new Error('Missing E2E_CLERK_EMAIL in .env')
  if (!password) throw new Error('Missing E2E_CLERK_PASSWORD in .env')
  if (!secretKey) throw new Error('Missing CLERK_SECRET_KEY in .env')

  const authDir = path.dirname(STORAGE_STATE)
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  // If a saved auth state already exists, skip re-running the setup
  if (fs.existsSync(STORAGE_STATE) && !forceSetup) {
    console.log('[setup] Existing auth state found, skipping global setup.')
    return
  }

  if (fs.existsSync(STORAGE_STATE) && forceSetup) {
    fs.rmSync(STORAGE_STATE, { force: true })
    console.log('[setup] Removed stale auth state due to E2E_FORCE_AUTH_SETUP=true')
  }

  // Ensure E2E tenant exists in Clerk + DB before sign-in
  const clerk = createClerkClient({ secretKey })
  const { data: users } = await clerk.users.getUserList({ emailAddress: [email] })
  if (!users.length) throw new Error(`Test user "${email}" not found in Clerk Dashboard.`)
  const user = await clerk.users.getUser(users[0].id)
  logE2EUserAuthCapabilities(user)
  assertPasswordCapableE2EUser(user, email)
  const userId = user.id
  console.log(`[setup] Found Clerk user: ${userId}`)
  await ensureE2ETenant(clerk, userId)

  // ── Sign in via form fill ──────────────────────────────────────────────────
  const signInUrl = new URL(signInPath, baseUrl).toString()
  console.log(`[setup] Navigating to ${signInUrl}...`)
  await page.goto(signInUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // Fail fast when route drift lands on a 404 page instead of the auth form.
  await expect(page.getByRole('heading', { name: /404|page not found/i })).toHaveCount(0)

  // Prefer accessible locators first, then fall back to robust structural selectors.
  const semanticEmailInput = page
    .getByLabel(/email|email address/i)
    .or(page.getByRole('textbox', { name: /email|email address/i }))
    .first()
  const fallbackEmailInput = page.locator('input[name="identifier"], input[type="email"]').first()
  const semanticReady = await semanticEmailInput.isVisible({ timeout: 20_000 }).catch(() => false)
  const emailInput = semanticReady ? semanticEmailInput : fallbackEmailInput

  await emailInput.waitFor({ state: 'visible', timeout: 20_000 })
  await emailInput.fill(email)

  const passwordField = page.locator('input[type="password"]:not([disabled]):not([aria-disabled="true"])').first()
  let passwordVisible = await passwordField.isVisible().catch(() => false)

  // Some Clerk screens are two-step (email -> password), others show both fields at once.
  if (!passwordVisible) {
    const continueBtn = page.locator('button[type="submit"]:visible, button:has-text("Continue"):visible').first()
    await continueBtn.click()
    passwordVisible = await passwordField.waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false)
  }

  if (!passwordVisible) {
    if (GOOGLE_OAUTH_URL.test(page.url())) {
      console.log('[setup] OAuth diversion detected, attempting fallback to password flow...')
      await page.goto(signInUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })

      const usePasswordBtn = page.locator(
        'button:has-text("Use password"), button:has-text("Continue with password"), button:has-text("Use another method")'
      ).first()

      if (await usePasswordBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await usePasswordBtn.click()
      }

      const fallbackEmailInput = page.locator('input[name="identifier"], input[type="email"]').first()
      await fallbackEmailInput.waitFor({ state: 'visible', timeout: 15_000 })
      await fallbackEmailInput.fill(email)
      await page.locator('button:has-text("Continue"):visible, button[type="submit"]:visible').first().click()
      await passwordField.waitFor({ state: 'visible', timeout: 12_000 })
    } else {
      throw new Error(
        'E2E auth could not reach a password prompt after identifier submission. Check Clerk sign-in settings for this environment.'
      )
    }
  }

  await expect(passwordField).toBeEnabled()
  await passwordField.fill(password)

  // Submit sign-in
  await page.locator('button:has-text("Continue"):visible, button[type="submit"]:visible').first().click()

  // Wait for redirect away from sign-in and fail fast on forced OAuth diversion.
  const authOutcome = await Promise.race([
    page.waitForURL(/\/(dashboard|onboarding|sign-in\/tasks)/, { timeout: 45_000 }).then(() => 'app'),
    page.waitForURL(GOOGLE_OAUTH_URL, { timeout: 45_000 }).then(() => 'oauth'),
  ]).catch(() => 'timeout')

  if (authOutcome === 'oauth') {
    throw new Error(
      'E2E auth redirected to Google OAuth after password submit. Configure this Clerk environment for password-first test login or use session-based bootstrap for automated tests.'
    )
  }

  if (authOutcome !== 'app') {
    throw new Error(
      `E2E auth did not reach dashboard/onboarding/task routes after submit. Current URL: ${page.url()}`
    )
  }

  console.log(`[setup] Sign-in completed. URL: ${page.url()}`)

  // Handle choose-organization task if Clerk presents it
  if (page.url().includes('/sign-in/tasks/choose-organization')) {
    console.log('[setup] Handling choose-organization task...')
    await page.locator('button:has-text("Continue"):visible, button[type="submit"]:visible').first().click()
    await page.waitForURL(/(\/dashboard|\/onboarding)/, { timeout: 30_000 })
  }

  // Handle onboarding flow if no org exists yet
  if (page.url().includes('/onboarding')) {
    console.log('[setup] Completing onboarding...')
    await page.waitForSelector('#org-name', { timeout: 10_000 })
    await page.locator('#org-name').clear()
    await page.locator('#org-name').type('E2E Test Organization')
    await page.locator('button[type="submit"]:not([disabled])').first().waitFor({ timeout: 5_000 })
    await page.locator('button[type="submit"]:not([disabled])').first().click()
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    console.log('[setup] Onboarding complete.')
  }

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  console.log('[setup] Dashboard confirmed. Saving auth state...')

  await page.context().storageState({ path: STORAGE_STATE })
  console.log('[setup] Auth state saved to', STORAGE_STATE)
})

function assertPasswordCapableE2EUser(user: any, email: string) {
  const externalStrategies = Array.isArray(user.externalAccounts)
    ? user.externalAccounts
        .map((account: any) => account.provider || account.strategy || account.verification?.strategy)
        .filter(Boolean)
    : []

  if (user.passwordEnabled) return

  const externalSummary = externalStrategies.length > 0
    ? ` Connected external providers: ${externalStrategies.join(', ')}.`
    : ''

  throw new Error(
    `E2E user ${email} does not have password auth enabled in Clerk. Use a dedicated password-enabled Clerk test user for this environment.${externalSummary}`
  )
}

function logE2EUserAuthCapabilities(user: any) {
  const externalProviders = Array.isArray(user.externalAccounts)
    ? user.externalAccounts.map((account: any) => account.provider).filter(Boolean)
    : []

  console.log('[setup] Clerk user auth capabilities', {
    passwordEnabled: Boolean(user.passwordEnabled),
    externalProviders,
  })
}

async function ensureE2ETenant(clerk: ReturnType<typeof createClerkClient>, userId: string) {
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: 10,
  })
  const membership = memberships.data.find((m) => {
    // Handle varying shapes returned by Clerk SDK across versions
    // Try multiple possible property names safely.
    try {
      const mi: any = m
      if (mi.public_user_data && mi.public_user_data.user_id === userId) return true
    } catch (e) {}
    try {
      const mi: any = m
      if (mi.publicUserData && (mi.publicUserData.user_id === userId || mi.publicUserData.userId === userId)) return true
    } catch (e) {}
    try {
      const mi: any = m
      if ((mi.user_id === userId) || (mi.userId === userId)) return true
    } catch (e) {}
    return false
  })

  if (membership) {
    const org = await clerk.organizations.getOrganization({ organizationId: membership.organization.id })
    await prisma.tenant.upsert({
      where: { clerkOrgId: org.id },
      create: {
        clerkOrgId: org.id,
        name: org.name,
        slug: org.slug,
      },
      update: {
        name: org.name,
      },
    })
    return org.id
  }

  const orgName = 'E2E Test Organization'
  const org = await clerk.organizations.createOrganization({
    name: orgName,
    createdBy: userId,
  })

  try {
    await clerk.organizations.createOrganizationMembership({
      organizationId: org.id,
      userId,
      role: 'admin',
    })
  } catch (error) {
    console.log('[setup] Unable to create E2E organization membership, continuing if organization was auto-owned by the creator.', error)
  }

  await prisma.tenant.upsert({
    where: { clerkOrgId: org.id },
    create: {
      clerkOrgId: org.id,
      name: org.name,
      slug: org.slug,
    },
    update: {
      name: org.name,
    },
  })

  return org.id
}
