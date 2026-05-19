import { randomUUID } from 'crypto'
import { test, expect, request as playwrightRequest } from '@playwright/test'
import { createClerkClient } from '@clerk/backend'
import { prisma } from '@/lib/prisma'

const clerkSecretKey = process.env.CLERK_SECRET_KEY
const clerkEmail = process.env.E2E_CLERK_EMAIL as string

if (!clerkSecretKey) throw new Error('Missing CLERK_SECRET_KEY for active org tests')
if (!clerkEmail) throw new Error('Missing E2E_CLERK_EMAIL for active org tests')

const clerk = createClerkClient({ secretKey: clerkSecretKey })

async function getE2EOrgId() {
  const users = await clerk.users.getUserList({ emailAddress: [clerkEmail] })
  if (!users.data.length) throw new Error(`Clerk user not found for ${clerkEmail}`)

  const user = await clerk.users.getUser(users.data[0].id)
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId: user.id,
    limit: 20,
  })

  const membership = memberships.data.find((m: any) => {
    return !!m.organization?.id
  })

  if (!membership || !membership.organization?.id) {
    throw new Error(`No organization membership found for ${clerkEmail}`)
  }

  return membership.organization.id
}

async function createMismatchTenant() {
  return prisma.tenant.create({
    data: {
      clerkOrgId: `org-mismatch-${randomUUID()}`,
      name: 'E2E mismatch tenant',
      slug: `e2e-mismatch-${Date.now()}`,
    },
  })
}

test.describe('Active org route security', () => {
  test('rejects unauthenticated requests', async ({ baseURL }) => {
    const anonymousRequest = await playwrightRequest.newContext({
      baseURL: baseURL ?? 'http://localhost:3000',
    })

    try {
      const response = await anonymousRequest.post('/api/active-org', {
        data: { orgId: 'org_fake' },
      })

      expect(response.status()).toBe(401)
    } finally {
      await anonymousRequest.dispose()
    }
  })

  test('accepts valid active org selection and sets server-side cookies', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const orgId = await getE2EOrgId()

    const result = await page.evaluate(async (orgId: string) => {
      const response = await fetch('/api/active-org', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })
      return {
        status: response.status,
        body: await response.json(),
      }
    }, orgId)

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)

    const cookies = await page.context().cookies()
    expect(cookies.some((cookie) => cookie.name === 'JG_ACTIVE_ORG')).toBe(true)
    expect(cookies.some((cookie) => cookie.name === 'JG_TENANT_ID')).toBe(true)
  })

  test('rejects tenant/org mismatch', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const orgId = await getE2EOrgId()
    const tenant = await createMismatchTenant()

    try {
      const result = await page.evaluate(async ({ orgId, tenantId }) => {
        const response = await fetch('/api/active-org', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orgId, tenantId }),
        })
        return {
          status: response.status,
          body: await response.json(),
        }
      }, { orgId, tenantId: tenant.id })

      expect(result.status).toBe(403)
      expect(result.body.error).toContain('Tenant/org mismatch')
    } finally {
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {})
    }
  })

  test('ignores forged JG_TENANT_ID cookie and still succeeds', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const orgId = await getE2EOrgId()

    await page.evaluate(() => {
      document.cookie = 'JG_TENANT_ID=forged; path=/'
    })

    const result = await page.evaluate(async (orgId: string) => {
      const response = await fetch('/api/active-org', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })
      return {
        status: response.status,
        body: await response.json(),
      }
    }, orgId)

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)

    const cookies = await page.context().cookies()
    const tenantCookie = cookies.find((cookie) => cookie.name === 'JG_TENANT_ID')
    expect(tenantCookie).toBeDefined()
    expect(tenantCookie?.value).not.toBe('forged')
  })

  test('rate limits POST /api/active-org after 20 requests', async ({ request }) => {
    for (let i = 0; i < 20; i += 1) {
      await request.post('/api/active-org', {
        data: { orgId: 'org_rate_limit' },
      })
    }

    const response = await request.post('/api/active-org', {
      data: { orgId: 'org_rate_limit' },
    })

    expect(response.status()).toBe(429)
  })
})
