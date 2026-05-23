import { createClerkClient } from '@clerk/backend'
import { prisma } from '@/lib/prisma'

export type E2EFixtureKey = 'userA' | 'userB' | 'userC' | 'userD'

export type E2EFixtureDefinition = {
  email: string
  requestedEmail: string
  firstName: string
  lastName: string
  orgs: Array<{
    name: string
    slug: string
  }>
}

export type E2EFixtureRecord = E2EFixtureDefinition & {
  userId: string
  orgIds: string[]
  tenantIds: string[]
}

export const E2E_FIXTURES: Record<E2EFixtureKey, E2EFixtureDefinition> = {
  userA: {
    email: 'e2e-user-a@example.com',
    requestedEmail: 'e2e-user-a@example.test',
    firstName: 'E2E',
    lastName: 'User A',
    orgs: [{ name: 'E2E Org A', slug: 'e2e-org-a' }],
  },
  userB: {
    email: 'e2e-user-b@example.com',
    requestedEmail: 'e2e-user-b@example.test',
    firstName: 'E2E',
    lastName: 'User B',
    orgs: [{ name: 'E2E Org B', slug: 'e2e-org-b' }],
  },
  userC: {
    email: 'e2e-user-c@example.com',
    requestedEmail: 'e2e-user-c@example.test',
    firstName: 'E2E',
    lastName: 'User C',
    orgs: [
      { name: 'E2E Org C1', slug: 'e2e-org-c1' },
      { name: 'E2E Org C2', slug: 'e2e-org-c2' },
    ],
  },
  userD: {
    email: 'e2e-user-d@example.com',
    requestedEmail: 'e2e-user-d@example.test',
    firstName: 'E2E',
    lastName: 'User D',
    orgs: [],
  },
}

function fixtureRecordPath() {
  return `${process.cwd()}/e2e/.auth/auth-fixtures.json`
}

async function ensureDatabaseSchema() {
  if (process.env.E2E_SKIP_PRISMA_DB_PUSH === 'true') return

  const { execFileSync } = await import('child_process')
  execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    stdio: 'inherit',
    env: process.env,
  })
}

async function ensureUser(
  clerk: ReturnType<typeof createClerkClient>,
  fixture: E2EFixtureDefinition,
  options?: { resetExisting?: boolean },
) {
  const existing = await clerk.users.getUserList({ emailAddress: [fixture.email] })
  if (existing.data.length > 0) {
    if (options?.resetExisting) {
      await clerk.users.deleteUser(existing.data[0].id)
    } else {
    return clerk.users.updateUser(existing.data[0].id, {
      createOrganizationEnabled: true,
      createOrganizationsLimit: 10,
    })
    }
  }

  const created = await clerk.users.createUser({
    emailAddress: [fixture.email],
    firstName: fixture.firstName,
    lastName: fixture.lastName,
    skipPasswordRequirement: true,
    skipPasswordChecks: true,
    skipLegalChecks: true,
  })

  return clerk.users.updateUser(created.id, {
    createOrganizationEnabled: true,
    createOrganizationsLimit: 10,
  })
}

async function ensureOrganization(
  clerk: ReturnType<typeof createClerkClient>,
  name: string,
  createdBy: string,
) {
  const listed = await clerk.organizations.getOrganizationList({ query: name, limit: 20 })
  const existing = listed.data.find((organization) => organization.name.trim().toLowerCase() === name.trim().toLowerCase())
  if (existing) return existing

  return clerk.organizations.createOrganization({ name, createdBy })
}

async function syncMemberships(
  clerk: ReturnType<typeof createClerkClient>,
  userId: string,
  desiredOrgIds: string[],
) {
  const currentMemberships = await clerk.users.getOrganizationMembershipList({ userId, limit: 100 })
  const desiredOrgSet = new Set(desiredOrgIds)
  const currentOrgIds = new Set(currentMemberships.data.map((membership) => membership.organization.id))

  for (const orgId of desiredOrgIds) {
    if (currentOrgIds.has(orgId)) continue
    try {
      await clerk.organizations.createOrganizationMembership({ organizationId: orgId, userId, role: 'admin' })
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      if (message.includes('not found')) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        await clerk.organizations.createOrganizationMembership({ organizationId: orgId, userId, role: 'admin' }).catch(() => undefined)
      } else {
        throw error
      }
    }
  }

  for (const membership of currentMemberships.data) {
    if (desiredOrgSet.has(membership.organization.id)) continue
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: membership.organization.id,
      userId,
    }).catch(() => undefined)
  }
}

async function ensureTenantForOrganization(org: { id: string; name: string; slug: string }) {
  try {
    return await prisma.tenant.upsert({
      where: { clerkOrgId: org.id },
      create: {
        clerkOrgId: org.id,
        name: org.name,
        slug: org.slug,
      },
      update: {
        name: org.name,
        slug: org.slug,
      },
    })
  } catch {
    const fallbackSlug = `${org.slug}-${org.id.slice(0, 6)}`
    return prisma.tenant.upsert({
      where: { clerkOrgId: org.id },
      create: {
        clerkOrgId: org.id,
        name: org.name,
        slug: fallbackSlug,
      },
      update: {
        name: org.name,
      },
    })
  }
}

export async function seedE2EFixtures(): Promise<Record<E2EFixtureKey, E2EFixtureRecord>> {
  await ensureDatabaseSchema()

  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required to seed E2E fixtures')
  }

  const clerk = createClerkClient({ secretKey })
  const seedCreatorEmail = process.env.E2E_CLERK_EMAIL
  if (!seedCreatorEmail) {
    throw new Error('E2E_CLERK_EMAIL is required to create fixture organizations')
  }

  const seedCreatorUsers = await clerk.users.getUserList({ emailAddress: [seedCreatorEmail] })
  const seedCreatorId = seedCreatorUsers.data[0]?.id
  if (!seedCreatorId) {
    throw new Error(`Could not find seed creator user for ${seedCreatorEmail}`)
  }

  const records = {} as Record<E2EFixtureKey, E2EFixtureRecord>

  for (const [fixtureKey, fixture] of Object.entries(E2E_FIXTURES) as Array<[E2EFixtureKey, E2EFixtureDefinition]>) {
    const user = await ensureUser(clerk, fixture, {
      // Zero-org user signs in via token and should start clean each run to
      // avoid Clerk task/session carryover from previous attempts.
      resetExisting: fixture.orgs.length === 0,
    })
    const orgIds: string[] = []
    const tenantIds: string[] = []

    if (fixture.orgs.length === 0) {
      await syncMemberships(clerk, user.id, [])
    }

    for (const orgFixture of fixture.orgs) {
      const org = await ensureOrganization(clerk, orgFixture.name, seedCreatorId)
      orgIds.push(org.id)
      const tenant = await ensureTenantForOrganization({
        id: org.id,
        name: org.name,
        slug: org.slug ?? orgFixture.slug,
      })
      tenantIds.push(tenant.id)
    }

    if (fixture.orgs.length > 0) {
      await syncMemberships(clerk, user.id, orgIds)
    }

    records[fixtureKey] = {
      ...fixture,
      userId: user.id,
      orgIds,
      tenantIds,
    }
  }

  return records
}

export async function saveE2EFixtureRecord(record: Record<E2EFixtureKey, E2EFixtureRecord>) {
  const fs = await import('fs')
  const path = await import('path')
  const outputPath = fixtureRecordPath()
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.promises.writeFile(outputPath, JSON.stringify(record, null, 2))
}

export async function readE2EFixtureRecord(): Promise<Record<E2EFixtureKey, E2EFixtureRecord> | null> {
  const fs = await import('fs')
  const outputPath = fixtureRecordPath()
  if (!fs.existsSync(outputPath)) return null
  return JSON.parse(await fs.promises.readFile(outputPath, 'utf8')) as Record<E2EFixtureKey, E2EFixtureRecord>
}

export async function signInTokenForUserId(userId: string) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required for E2E sign-in tokens')
  }

  const clerk = createClerkClient({ secretKey })
  const token = await clerk.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 300,
  })

  if (!token?.url) {
    throw new Error(`Failed to create sign-in token for ${userId}`)
  }

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || process.env.TENANT_APP_BASE_URL || 'http://localhost:3000'
  const tokenUrl = new URL(token.url)
  tokenUrl.searchParams.set('redirect_url', `${baseUrl.replace(/\/$/, '')}/`)
  tokenUrl.searchParams.set('after_sign_in_url', `${baseUrl.replace(/\/$/, '')}/`)

  return tokenUrl.toString()
}

export async function signInTokenForEmail(email: string) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required for E2E sign-in tokens')
  }

  const clerk = createClerkClient({ secretKey })
  const users = await clerk.users.getUserList({ emailAddress: [email] })
  if (!users.data.length) {
    throw new Error(`Clerk user not found for ${email}`)
  }

  return signInTokenForUserId(users.data[0].id)
}

export async function sessionJwtForUserId(userId: string) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required for E2E session tokens')
  }

  const clerk = createClerkClient({ secretKey })
  const session = await clerk.sessions.createSession({ userId })
  const token = await clerk.sessions.getToken(session.id)
  if (!token?.jwt) {
    throw new Error(`Failed to mint session JWT for ${userId}`)
  }

  return token.jwt
}

export async function sessionJwtForEmail(email: string) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required for E2E session tokens')
  }

  const clerk = createClerkClient({ secretKey })
  const users = await clerk.users.getUserList({ emailAddress: [email] })
  if (!users.data.length) {
    throw new Error(`Clerk user not found for ${email}`)
  }

  return sessionJwtForUserId(users.data[0].id)
}

export async function setMembershipsForUserId(userId: string, orgIds: string[]) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required for membership updates')
  }

  const clerk = createClerkClient({ secretKey })
  await syncMemberships(clerk, userId, orgIds)
}

export async function setMembershipsForEmail(email: string, orgIds: string[]) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required for membership updates')
  }

  const clerk = createClerkClient({ secretKey })
  const users = await clerk.users.getUserList({ emailAddress: [email] })
  if (!users.data.length) {
    throw new Error(`Clerk user not found for ${email}`)
  }

  await setMembershipsForUserId(users.data[0].id, orgIds)
}
