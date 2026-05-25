import path from 'path'
import { chromium } from '@playwright/test'

async function main() {
  const root = path.resolve(process.cwd())
  const dotenv = await import('dotenv')
  const dotenvExpand = await import('dotenv-expand')
  const envFiles = [path.join(root, '.env'), path.join(root, '.env.local')]
  for (const file of envFiles) {
    dotenvExpand.expand(dotenv.config({ path: file, override: false }))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
  const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'
  const email = process.env.E2E_CLERK_EMAIL
  const password = process.env.E2E_CLERK_PASSWORD

  if (!email || !password) {
    throw new Error('E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD must be set in environment')
  }
  const emailAddress: string = email

  function info(...args: Array<unknown>) {
    console.log('[INFO]', ...args)
  }

  function warn(...args: Array<unknown>) {
    console.warn('[WARN]', ...args)
  }

  async function fillLoginForm(page: any) {
    const clerkModule = await import('@clerk/backend')
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) throw new Error('CLERK_SECRET_KEY must be set to generate a Clerk sign-in token')
    const clerk = clerkModule.createClerkClient({ secretKey })

    const users = await clerk.users.getUserList({ emailAddress: [emailAddress] })
    if (!users.data.length) {
      throw new Error(`Clerk user not found for ${emailAddress}`)
    }
    const user = users.data[0]
    const token = await clerk.signInTokens.createSignInToken({ userId: user.id, expiresInSeconds: 300 })
    if (!token?.url) {
      throw new Error('Failed to create Clerk sign-in token')
    }
    const tokenUrl = new URL(token.url)
    tokenUrl.searchParams.set('redirect_url', `${appUrl}/`)
    tokenUrl.searchParams.set('after_sign_in_url', `${appUrl}/`)

    info('navigating to Clerk sign-in token URL')
    await page.goto(tokenUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForLoadState('networkidle')
    info('Sign-in token page loaded; navigating to app root')
    await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForURL(/\/select-organization|\/dashboard|\/onboarding/, { timeout: 45000 })
  }

  async function ensureSignedOut(page: any) {
    const cookies = await page.context().cookies()
    const names = cookies.map((c: { name: string }) => c.name)
    info('cookies after logout', names.join(', ') || '<none>')
    if (names.includes('JG_TEST_AUTH')) {
      warn('test auth cookie still present after sign-out')
    }
    const activeOrg = cookies.find((c: { name: string }) => c.name === 'JG_ACTIVE_ORG')
    const tenantId = cookies.find((c: { name: string }) => c.name === 'JG_TENANT_ID')
    info('JG_ACTIVE_ORG', activeOrg ? '<present>' : '<absent>')
    info('JG_TENANT_ID', tenantId ? '<present>' : '<absent>')
    if (activeOrg || tenantId) {
      throw new Error('Active org or tenant cookies were not cleared after sign-out')
    }
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on('console', (msg) => {
    console.log('[BROWSER]', msg.type(), msg.text())
  })

  page.on('requestfailed', (req) => {
    console.warn('[REQ FAIL]', req.method(), req.url(), req.failure()?.errorText)
  })

  page.on('requestfinished', (req) => {
    const res = req.response()
    if (!res) return
    const url = req.url()
    if (url.includes('/api/') || url.includes('clerk.com') || url.includes('/_next/') || url.includes('sign-in')) {
      const status = typeof (res as any).status === 'function' ? (res as any).status() : (res as any).status
      console.log('[REQ]', req.method(), status, url)
    }
  })

  const initialCookies = await context.cookies()
  info('initial cookies present', initialCookies.map((c) => c.name).join(', ') || '<none>')
  if (initialCookies.some((c) => c.name === 'JG_TEST_AUTH')) {
    throw new Error('Test auth fixture cookie present before sign-in')
  }

  await fillLoginForm(page)
  const firstUrl = page.url()
  console.log('[NAV]', 'post-login url', firstUrl)
  if (!/\/select-organization|\/dashboard|\/onboarding/.test(firstUrl)) {
    throw new Error('Unexpected post-login route: ' + firstUrl)
  }

  await page.waitForURL(/\/select-organization/, { timeout: 30000 })

  const identity = await page.locator('[data-testid="signed-in-user-identity"]').textContent().catch(() => null)
  console.log('[IDENTITY]', identity?.trim() || '<not found>')
  if (!identity) {
    throw new Error('Signed-in identity text not found on /select-organization')
  }

  const cookiesBefore = await context.cookies()
  if (cookiesBefore.some((c) => c.name === 'JG_TEST_AUTH')) {
    throw new Error('Test auth cookie present while running real Clerk sign-in')
  }

  console.log('[ACTION] clicking sign-out button')
  await page.locator('[data-testid="select-org-sign-out"]').click()
  await page.waitForURL(/\/sign-in/, { timeout: 30000 })
  console.log('[NAV]', 'after sign-out landed', page.url())

  await ensureSignedOut(page)

  await page.goto(appUrl, { waitUntil: 'networkidle' })
  await page.waitForURL(/\/sign-in/, { timeout: 30000 })
  console.log('[VERIFY]', 'refresh after logout landed at', page.url())

  await fillLoginForm(page)
  const secondUrl = page.url()
  console.log('[NAV]', 'second login landed', secondUrl)
  if (/\/onboarding/.test(secondUrl)) {
    throw new Error('Account unexpectedly forced onboarding after second login')
  }

  if (!/\/select-organization|\/dashboard/.test(secondUrl)) {
    throw new Error('Second login landed unexpected route: ' + secondUrl)
  }

  if (/\/select-organization/.test(secondUrl)) {
    info('selecting Namaste Boston Homes if available')
    const orgCard = page.locator('[data-testid="organization-card"]').filter({ hasText: 'Namaste Boston Homes' }).first()
    await orgCard.waitFor({ state: 'visible', timeout: 30000 })
    await orgCard.click()
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    console.log('[NAV]', 'selected org and landed on dashboard', page.url())
  } else {
    console.log('[INFO]', 'second login already landed on dashboard', page.url())
  }

  await browser.close()
}

main().catch((error) => {
  console.error('[ERROR]', error)
  process.exit(1)
})