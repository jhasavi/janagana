import { test, expect } from '../fixtures/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function waitForUserByEmail(email: string, timeout = 15000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      return user
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for internal user record for ${email}`)
}

async function maybeFillClerkSignUp(page: any, email: string, password: string) {
  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await expect(emailInput).toBeVisible({ timeout: 15000 })
  await emailInput.fill(email)
  await expect(passwordInput).toBeVisible()
  await passwordInput.fill(password)

  const submitButton = page.locator('button:has-text("Sign up"), button:has-text("Continue"), button:has-text("Create account")').first()
  await expect(submitButton).toBeVisible()
  await submitButton.click()
}

test.describe('Seeded tenant switch', () => {
  test('maps a signed-in user to a seeded tenant and displays its real dashboard counts', async ({ page }) => {
    const uniqueEmail = `playwright+tenant-switch-${Date.now()}@example.com`
    const password = 'Test12345!'

    await page.goto('http://localhost:3000/sign-up')
    await maybeFillClerkSignUp(page, uniqueEmail, password)

    // After sign-up we should land on onboarding or the dashboard.
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30000 })

    if (page.url().includes('/onboarding')) {
      await page.fill('input#name', 'Temporary Tenant')
      await page.fill('input#slug', `temporary-tenant-${Date.now()}`)
      await page.click('button:has-text("Create Organization")')
      await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    }

    const user = await waitForUserByEmail(uniqueEmail)
    const seedTenant = await prisma.tenant.findUnique({ where: { slug: 'tenant-non-profit' } })
    if (!seedTenant) {
      throw new Error('Expected seeded tenant tenant-non-profit not found')
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        tenantId: seedTenant.id,
        role: 'OWNER',
      },
    })

    await page.goto('http://localhost:3000/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')

    await expect(page.locator('div', { hasText: 'Total Members' })).toContainText('4')
    await expect(page.locator('div', { hasText: 'Total Events' })).toContainText('1')
    await expect(page.locator('div', { hasText: 'Volunteer Opportunities' })).toContainText('0')
  })
})
