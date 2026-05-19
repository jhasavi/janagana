import fs from 'fs'
import path from 'path'
import { chromium, type BrowserContext, type FullConfig, type Page } from '@playwright/test'

const STORAGE_STATE = path.join(__dirname, '.auth', 'user.json')
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.TENANT_APP_BASE_URL || 'http://localhost:3000'
const signInPathRaw = process.env.E2E_SIGN_IN_PATH || process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'
const signInPath = signInPathRaw.startsWith('/') ? signInPathRaw : `/${signInPathRaw}`
const signInURL = `${BASE_URL.replace(/\/$/, '')}${signInPath}`

async function saveAuthState(context: BrowserContext) {
  await fs.promises.mkdir(path.dirname(STORAGE_STATE), { recursive: true })
  await context.storageState({ path: STORAGE_STATE })
}

async function waitForDashboard(page: Page) {
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 120_000 })
  const current = page.url()
  return current
}

async function clickPrimaryButton(page: Page) {
  const button = page.locator('button:has-text("Sign in"), button:has-text("Sign In"), button:has-text("Continue"), button:has-text("Log in"), button:has-text("Log In"), button:has-text("Next")').first()
  if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
    await button.click()
    return true
  }
  return false
}

async function loginWithEmail(page: Page, email: string, password: string) {
  const emailInput = page.locator('input[type="email"], input[name*="email"], input[id*="email"]').first()
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(email)
    await clickPrimaryButton(page)
  }

  const passwordInput = page.locator('input[type="password"], input[name*="password"], input[id*="password"]').first()
  if (await passwordInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    await passwordInput.fill(password)
    await clickPrimaryButton(page)
  }
}

async function ensureLoggedIn(page: Page, email: string, password: string) {
  await page.goto(signInURL, { waitUntil: 'domcontentloaded' })
  const current = page.url()

  if (current.includes('/dashboard') || current.includes('/onboarding')) {
    return
  }

  await loginWithEmail(page, email, password)
  await waitForDashboard(page)
}

async function globalSetup(_config: FullConfig) {
  const email = process.env.E2E_CLERK_EMAIL || ''
  const password = process.env.E2E_CLERK_PASSWORD || ''

  if (!email || !password) {
    throw new Error(
      'E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD must be set to run authenticated E2E tests.'
    )
  }

  if (fs.existsSync(STORAGE_STATE)) {
    return
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await ensureLoggedIn(page, email, password)
    await saveAuthState(context)
  } finally {
    await browser.close()
  }
}

export default globalSetup
