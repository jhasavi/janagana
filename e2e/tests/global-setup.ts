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
 */

import { test as setup, expect } from '@playwright/test'
import { createClerkClient } from '@clerk/backend'
import path from 'path'
import fs from 'fs'
import { prisma } from '@/lib/prisma'

const STORAGE_STATE = path.join(__dirname, '..', '.auth', 'user.json')

setup('authenticate via email/password form fill', async ({ page }) => {
  const email = process.env.E2E_CLERK_EMAIL
  const password = process.env.E2E_CLERK_PASSWORD
  const secretKey = process.env.CLERK_SECRET_KEY

  if (!email) throw new Error('Missing E2E_CLERK_EMAIL in .env')
  if (!password) throw new Error('Missing E2E_CLERK_PASSWORD in .env')
  if (!secretKey) throw new Error('Missing CLERK_SECRET_KEY in .env')

  const authDir = path.dirname(STORAGE_STATE)
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  // If a saved auth state already exists, skip re-running the setup
  if (fs.existsSync(STORAGE_STATE)) {
    console.log('[setup] Existing auth state found, skipping global setup.')
    return
  }

  // Ensure E2E tenant exists in Clerk + DB before sign-in
  const clerk = createClerkClient({ secretKey })
  const { data: users } = await clerk.users.getUserList({ emailAddress: [email] })
  if (!users.length) throw new Error(`Test user "${email}" not found in Clerk Dashboard.`)
  const userId = users[0].id
  console.log(`[setup] Found Clerk user: ${userId}`)
  await ensureE2ETenant(clerk, userId)

  // ── Sign in via form fill ──────────────────────────────────────────────────
  console.log('[setup] Navigating to /sign-in...')
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // Clerk renders an <input> with identifier (email) as the first step
  await page.waitForSelector('input[name="identifier"], input[type="email"]', { timeout: 20_000 })
  await page.locator('input[name="identifier"], input[type="email"]').first().fill(email)

  // Click "Continue" or press Enter to proceed to password step
  const continueBtn = page.locator('button[type="submit"]:visible, button:has-text("Continue"):visible').first()
  await continueBtn.click()

  // Wait for password field
  await page.waitForSelector('input[type="password"]', { timeout: 20_000 })
  await page.locator('input[type="password"]').first().fill(password)

  // Submit sign-in
  await page.locator('button[type="submit"]:visible').first().click()

  // Wait for redirect away from sign-in
  await page.waitForURL(/localhost:3000\/(dashboard|onboarding|sign-in\/tasks)/, { timeout: 45_000 })
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
