import { test, expect } from '@playwright/test'
import { signInTokenForEmail } from '../auth-fixtures'

const smokeEmail = process.env.E2E_CLERK_EMAIL || ''
const smokeBaseURL = process.env.REAL_CLERK_SMOKE_BASE_URL || ''
const hasSmokeCredentials = Boolean(process.env.CLERK_SECRET_KEY && smokeEmail && smokeBaseURL)

test.skip(!hasSmokeCredentials, 'Real Clerk smoke test requires REAL_CLERK_SMOKE_BASE_URL, CLERK_SECRET_KEY, and E2E_CLERK_EMAIL')

test.use({ baseURL: smokeBaseURL })

test('real Clerk sign-in and sign-out smoke', async ({ page }) => {
  try {
    await page.goto(await signInTokenForEmail(smokeEmail), { waitUntil: 'domcontentloaded' })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/(dashboard|onboarding|select-organization)/, { timeout: 30_000 })

    await page.evaluate(async () => {
      const clerk = (window as typeof window & { Clerk?: { signOut: (options?: { redirectUrl?: string }) => Promise<void> } }).Clerk
      if (!clerk) {
        throw new Error('Clerk client not available on page')
      }

      await clerk.signOut({ redirectUrl: '/api/sign-out' })
    })
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 30_000 })

    const cookies = await page.context().cookies()
    expect(cookies.find((cookie) => cookie.name === 'JG_ACTIVE_ORG')).toBeUndefined()
    expect(cookies.find((cookie) => cookie.name === 'JG_TENANT_ID')).toBeUndefined()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('Too Many Requests') || message.includes('429')) {
      test.skip(true, `Blocked by Clerk rate limit: ${message}`)
    }
    throw error
  }
})
