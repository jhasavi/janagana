import { test as base, Page, APIRequestContext } from '@playwright/test';

type AuthFixtures = {
  loginAsAdmin: (page: Page, tenant: string) => Promise<void>;
  loginAsMember: (page: Page, tenant: string) => Promise<void>;
  createTestOrg: (page: Page) => Promise<void>;
};

async function signInTestUser(request: APIRequestContext, page: Page, params: {
  email: string
  password?: string
  firstName?: string
  lastName?: string
  tenantSlug?: string
  role?: string
}) {
  const response = await request.post('/api/test-login', {
    data: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const text = await response.text()
  let body: any = null
  try {
    body = text ? JSON.parse(text) : null
  } catch (error) {
    throw new Error(`Test login failed: status=${response.status()} body=${text}`)
  }

  if (!response.ok) {
    throw new Error(`Test login failed: status=${response.status()} error=${body?.error ?? JSON.stringify(body)} body=${text}`)
  }

  // Navigate to sign-in page and manually sign in
  await page.goto('http://localhost:3000/sign-in')
  
  // Fill in email
  await page.fill('input[name="emailAddress"]', params.email)
  
  // Fill in password
  await page.fill('input[name="password"]', params.password || 'Test12345!')
  
  // Click continue
  await page.click('button[type="submit"]')
  
  // Wait for navigation to complete
  await page.waitForLoadState('networkidle')
}

export const test = base.extend<AuthFixtures>({
  loginAsAdmin: async ({ request, page }, use) => {
    const login = async (tenant: string) => {
      await signInTestUser(request, page, {
        email: 'admin@test.com',
        password: 'test-password',
        firstName: 'Admin',
        lastName: 'Test',
        tenantSlug: tenant,
        role: 'OWNER',
      })
      await page.waitForURL(/\/dashboard/, { timeout: 60000 })
    }

    await use(login)
  },

  loginAsMember: async ({ request, page }, use) => {
    const login = async (tenant: string) => {
      await signInTestUser(request, page, {
        email: 'member@test.com',
        password: 'test-password',
        firstName: 'Member',
        lastName: 'Test',
        tenantSlug: tenant,
        role: 'STAFF',
      })
      await page.waitForURL(/\/dashboard|\/portal/, { timeout: 60000 })
    }

    await use(login)
  },

  createTestOrg: async ({ request, page }, use) => {
    const create = async () => {
      const email = `admin+${Date.now()}@test.com`
      await signInTestUser(request, page, {
        email,
        password: 'Test12345!',
        firstName: 'Test',
        lastName: 'Admin',
      })
      await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 60000 })
      await page.goto('http://localhost:3000/dashboard')
      await page.waitForURL(/\/onboarding/, { timeout: 60000 })
    }

    await use(create)
  },
});

export { expect } from '@playwright/test';
