/**
 * Global E2E Setup — Programmatic Clerk Auth
 *
 * Uses Clerk Backend API to issue a one-time sign-in token, then navigates
 * to the app with that token to establish a session — NO form interaction
 * needed. Works with any auth method (social login, password, etc.).
 *
 * Required env vars (.env):
 *   E2E_CLERK_EMAIL   — email of a Clerk user in your project
 *   CLERK_SECRET_KEY  — already required for the app itself
 */

import { test as setup, expect } from '@playwright/test'
import { createClerkClient } from '@clerk/backend'
import path from 'path'
import fs from 'fs'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

const STORAGE_STATE = path.join(__dirname, '..', '.auth', 'user.json')

setup('authenticate via Clerk token (programmatic)', async ({ page }) => {
  const email = process.env.E2E_CLERK_EMAIL
  const secretKey = process.env.CLERK_SECRET_KEY

  if (!email) throw new Error('Missing E2E_CLERK_EMAIL in .env')
  if (!secretKey) throw new Error('Missing CLERK_SECRET_KEY in .env')

  const authDir = path.dirname(STORAGE_STATE)
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  // If a saved auth state already exists, skip re-running the setup to avoid
  // flaky Clerk sign-in token redirects during local development.
  if (fs.existsSync(STORAGE_STATE)) {
    console.log('[setup] Existing auth state found, skipping global setup.')
    return
  }

  console.log(`[setup] Creating Clerk sign-in token for ${email}...`)
  const clerk = createClerkClient({ secretKey })

  const { data: users } = await clerk.users.getUserList({ emailAddress: [email] })
  if (!users.length) {
    throw new Error(`Test user "${email}" not found in Clerk Dashboard.`)
  }

  const user = users[0]
  const userId = user.id
  console.log(`[setup] Found Clerk user: ${userId}`)

  const orgId = await ensureE2ETenant(clerk, userId)
  console.log(`[setup] Ensured Clerk org exists: ${orgId}`)

  const signInToken = await clerk.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 60,
  })

  console.log('[setup] Navigating with Clerk sign-in token URL...')
  const signInUrl = new URL(signInToken.url)
  signInUrl.searchParams.set('redirect_url', 'http://localhost:3000/dashboard')

  await page.goto(signInUrl.toString(), {
    waitUntil: 'load',
    timeout: 45_000,
  })

  await page.waitForURL(/localhost:3000\/(dashboard|onboarding|sign-in|sign-in\/tasks\/choose-organization)/, {
    timeout: 45_000,
  })

  console.log(`[setup] Clerk token redirect completed. URL: ${page.url()}`)

  await page.goto('/dashboard', {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  })

  await page.waitForURL(/localhost:3000\/(dashboard|onboarding|sign-in)/, {
    timeout: 45_000,
  })

  if (page.url().includes('/sign-in')) {
    throw new Error('Clerk sign-in token did not establish a session; dashboard redirected to sign-in.')
  }

  console.log(`[setup] Authenticated. URL: ${page.url()}`)

  if (page.url().includes('/sign-in/tasks/choose-organization')) {
    console.log('[setup] Clerk choose-organization task page detected. Continuing...')
    await page.locator('button:has-text("Continue"):visible, button[type="submit"]:visible').first().click()
    await page.waitForURL(/(\/dashboard|\/onboarding)/, { timeout: 30_000 })
    console.log(`[setup] After choose-organization URL: ${page.url()}`)
  }

  if (page.url().includes('/onboarding')) {
    console.log('[setup] No org — completing onboarding form...')
    await page.waitForSelector('#org-name', { timeout: 10_000 })
    // Use .type() so React's onChange fires and state updates (fill() sets DOM only)
    await page.locator('#org-name').clear()
    await page.locator('#org-name').type('E2E Test Organization')
    // Wait for button to become enabled (React state update)
    await page.locator('button[type="submit"]:not([disabled])').first().waitFor({ timeout: 5_000 })

    // Listen for any toast/error before clicking
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('localhost') && res.request().method() === 'POST',
      { timeout: 15_000 }
    ).catch(() => null)

    await page.locator('button[type="submit"]:not([disabled])').first().click()

    const response = await responsePromise
    if (response) {
      const status = response.status()
      console.log(`[setup] Server response status: ${status}`)
      if (status >= 400) {
        const body = await response.text().catch(() => '')
        throw new Error(`Onboarding server action failed (${status}): ${body.slice(0, 500)}`)
      }
    }

    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    console.log('[setup] Onboarding complete.')
  }

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  console.log('[setup] Dashboard confirmed. Saving auth state...')

  await page.context().storageState({ path: STORAGE_STATE })
  console.log('[setup] Auth state saved to', STORAGE_STATE)

  const browser = page.context().browser()
  if (!browser) throw new Error('Unable to access browser instance for auth verification')

  const verifyContext = await browser.newContext({ storageState: STORAGE_STATE })
  const verifyPage = await verifyContext.newPage()
  await verifyPage.goto('http://localhost:3000/dashboard', {
    waitUntil: 'networkidle',
    timeout: 30_000,
  })

  if (verifyPage.url().startsWith('http://localhost:3000/sign-in')) {
    throw new Error('Saved auth state did not preserve login; dashboard redirected to sign-in.')
  }

  await verifyContext.close()
  console.log('[setup] Verified auth state is reusable.')
})

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
