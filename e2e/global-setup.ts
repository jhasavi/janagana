import * as fs from 'fs'
import * as path from 'path'
import { chromium, type BrowserContext, type FullConfig, type Page } from '@playwright/test'
import { createClerkClient } from '@clerk/backend'

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

async function getLocator(page: Page, selector: string) {
  const primary = page.locator(selector)
  if (await primary.count()) return primary.first()

  for (const frame of page.frames()) {
    const frameLocator = frame.locator(selector)
    if (await frameLocator.count()) return frameLocator.first()
  }

  return page.locator(selector).first()
}

async function waitForLocator(page: Page, selector: string, timeout = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const locator = await getLocator(page, selector)
    if (await locator.count()) {
      return locator
    }
    await page.waitForTimeout(250)
  }
  throw new Error(`Timed out waiting for selector: ${selector}`)
}

async function getButtonLocator(page: Page, selector: string) {
  const primary = page.locator(selector)
  if (await primary.count()) return primary.first()

  for (const frame of page.frames()) {
    const frameLocator = frame.locator(selector)
    if (await frameLocator.count()) return frameLocator.first()
  }

  return page.locator(selector).first()
}

async function findPrimaryButton(page: Page) {
  const selectors = 'button, input[type="submit"], input[type="button"]'
  const candidates = [
    'Continue',
    'Continue with email',
    'Continue with password',
    'Sign in',
    'Sign In',
    'Log in',
    'Log In',
    'Submit',
    'Create',
    'Next',
  ]

  const locators = [page.locator(selectors), ...page.frames().map((frame) => frame.locator(selectors))]

  for (const locator of locators) {
    const count = await locator.count()
    for (let i = 0; i < count; i++) {
      const button = locator.nth(i)
      if (!(await button.isVisible({ timeout: 5000 }).catch(() => false))) continue
      if (!(await button.isEnabled({ timeout: 5000 }).catch(() => false))) continue
      const text = (await button.textContent())?.trim() ?? ''
      if (!text) continue
      if (candidates.some((candidate) => text.includes(candidate))) {
        return button
      }
    }
  }

  const fallback = await getButtonLocator(page, 'button:has-text("Continue")')
  if (await fallback.isVisible({ timeout: 5000 }).catch(() => false)) {
    return fallback
  }

  return await getButtonLocator(page, 'button[type="submit"]')
}

async function clickPrimaryButton(page: Page) {
  const button = await findPrimaryButton(page)
  if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
    await button.click()
    await page.waitForLoadState('networkidle').catch(() => {})
    return true
  }
  return false
}

async function loginWithGoogle(page: Page, email: string, password: string) {
  const emailSelector = 'input[type="email"], input#identifierId'
  const emailInput = await waitForLocator(page, emailSelector, 30000)
  if (!(await emailInput.isVisible({ timeout: 10000 }).catch(() => false))) {
    throw new Error('Unable to find Google email input on sign-in page')
  }

  await emailInput.fill(email)
  await clickPrimaryButton(page)

  const passwordSelector = 'input[type="password"]'
  const passwordInput = await waitForLocator(page, passwordSelector, 30000)
  if (!(await passwordInput.isVisible({ timeout: 10000 }).catch(() => false))) {
    throw new Error('Unable to find Google password input on sign-in page')
  }

  await passwordInput.fill(password)
  await clickPrimaryButton(page)
}

async function loginWithEmail(page: Page, email: string, password: string) {
  const currentUrl = page.url()
  if (currentUrl.includes('accounts.google.com')) {
    return loginWithGoogle(page, email, password)
  }

  const emailSelector = [
    'input[type="email"]',
    'input[name="identifier"]',
    'input[name*="email"]',
    'input[id*="email"]',
    'input[placeholder*="email"]',
    'input[type="text"][inputmode="email"]',
  ].join(', ')

  const emailInput = await waitForLocator(page, emailSelector, 20000)
  if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    await emailInput.fill(email)
  } else {
    throw new Error('Unable to find Clerk email/identifier input on sign-in page')
  }

  const passwordSelector = [
    'input[type="password"]',
    'input[name*="password"]',
    'input[id*="password"]',
    'input[name*="pass"]',
    'input[placeholder*="password"]',
  ].join(', ')

  const passwordInput = await waitForLocator(page, passwordSelector, 20000)
  if (await passwordInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    await passwordInput.fill(password)
  } else {
    throw new Error('Unable to find Clerk password input on sign-in page')
  }

  const clicked = await clickPrimaryButton(page)
  if (!clicked) {
    throw new Error('Unable to submit Clerk sign-in form; primary button not found')
  }
}

async function getDebugState(page: Page) {
  const frameUrls = page.frames().map((frame) => frame.url())
  const buttonCount = await page.locator('button').count()
  const inputCount = await page.locator('input').count()
  return { url: page.url(), frameUrls, buttonCount, inputCount }
}

async function signInWithClerkToken(page: Page, email: string) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required for token-based E2E auth')
  }

  const clerk = createClerkClient({ secretKey })
  const users = await clerk.users.getUserList({ emailAddress: [email] })
  if (!users.data.length) {
    throw new Error(`Clerk user not found for ${email}`)
  }

  const userId = users.data[0].id
  const token = await clerk.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 300,
  })
  if (!token?.url) {
    throw new Error('Failed to create Clerk sign-in token for E2E auth')
  }

  await page.goto(token.url, { waitUntil: 'domcontentloaded' })
  await waitForDashboard(page)
}

async function ensureLoggedIn(page: Page, email: string, password: string) {
  await page.goto(signInURL, { waitUntil: 'load' })
  const current = page.url()

  if (current.includes('/dashboard') || current.includes('/onboarding')) {
    return
  }

  const shouldUseTokenAuth = process.env.E2E_USE_SIGNIN_TOKEN !== 'false' && Boolean(process.env.CLERK_SECRET_KEY)
  if (shouldUseTokenAuth) {
    try {
      await signInWithClerkToken(page, email)
      return
    } catch (error) {
      console.warn('[global-setup] Clerk sign-in token failed, falling back to email/password auth', error)
      await page.goto(signInURL, { waitUntil: 'load' })
    }
  }

  if (!email || !password) {
    throw new Error(
      'E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD must be set to run email/password authenticated E2E tests when token auth is unavailable.'
    )
  }

  await loginWithEmail(page, email, password)
  try {
    await waitForDashboard(page)
  } catch (error) {
    const debugState = await getDebugState(page)
    console.error('[global-setup] sign-in debug state', debugState)
    throw error
  }
}

async function verifyExistingAuthState() {
  if (!fs.existsSync(STORAGE_STATE)) return false

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: STORAGE_STATE })
  const page = await context.newPage()

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    const url = page.url()
    return url.includes('/dashboard') || url.includes('/onboarding')
  } catch {
    return false
  } finally {
    await browser.close()
  }
}

async function globalSetup(_config: FullConfig) {
  const email = process.env.E2E_CLERK_EMAIL || ''
  const password = process.env.E2E_CLERK_PASSWORD || ''

  if (!email || !password) {
    throw new Error(
      'E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD must be set to run authenticated E2E tests.'
    )
  }

  if (await verifyExistingAuthState()) {
    return
  }

  if (fs.existsSync(STORAGE_STATE)) {
    await fs.promises.unlink(STORAGE_STATE).catch(() => undefined)
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
