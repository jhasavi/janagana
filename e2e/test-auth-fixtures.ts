import { prisma } from '@/lib/prisma'
import { TEST_AUTH_ORGS, TEST_AUTH_USERS, resetTestAuthState } from '@/lib/auth/test-auth-state'

export type E2EFixtureKey = 'userA' | 'userB' | 'userC' | 'userD'

export type E2EFixtureRecord = {
  userId: string
  email: string
  orgIds: string[]
  tenantIds: string[]
  memberIds?: string[]
  eventIds?: string[]
}

export const E2E_FIXTURES: Record<E2EFixtureKey, E2EFixtureRecord> = {
  userA: {
    ...TEST_AUTH_USERS['e2e-user-a'],
    orgIds: [TEST_AUTH_ORGS.orgA.orgId],
    tenantIds: [],
  },
  userB: {
    ...TEST_AUTH_USERS['e2e-user-b'],
    orgIds: [TEST_AUTH_ORGS.orgB.orgId],
    tenantIds: [],
  },
  userC: {
    ...TEST_AUTH_USERS['e2e-user-c'],
    orgIds: [TEST_AUTH_ORGS.orgC1.orgId, TEST_AUTH_ORGS.orgC2.orgId],
    tenantIds: [],
  },
  userD: {
    ...TEST_AUTH_USERS['e2e-user-d'],
    orgIds: [],
    tenantIds: [],
  },
}

function fixtureRecordPath() {
  return `${process.cwd()}/e2e/.auth/auth-fixtures.json`
}

async function ensureTenantForOrganization(orgId: string, name: string, slug: string) {
  return prisma.tenant.upsert({
    where: { clerkOrgId: orgId },
    create: { clerkOrgId: orgId, name, slug },
    update: { name, slug },
  })
}

export async function seedE2EFixtures() {
  resetTestAuthState()

  const orgATenant = await ensureTenantForOrganization(TEST_AUTH_ORGS.orgA.orgId, TEST_AUTH_ORGS.orgA.name, 'e2e-org-a')
  const orgBTenant = await ensureTenantForOrganization(TEST_AUTH_ORGS.orgB.orgId, TEST_AUTH_ORGS.orgB.name, 'e2e-org-b')
  const orgC1Tenant = await ensureTenantForOrganization(TEST_AUTH_ORGS.orgC1.orgId, TEST_AUTH_ORGS.orgC1.name, 'e2e-org-c1')
  const orgC2Tenant = await ensureTenantForOrganization(TEST_AUTH_ORGS.orgC2.orgId, TEST_AUTH_ORGS.orgC2.name, 'e2e-org-c2')

  // Ensure member records exist so portal can resolve user → member
  const memberA = await prisma.member.upsert({
    where: { id: `e2e-member-a-${orgATenant.id}` },
    create: {
      id: `e2e-member-a-${orgATenant.id}`,
      tenantId: orgATenant.id,
      email: TEST_AUTH_USERS['e2e-user-a'].email,
      firstName: 'E2E User',
      lastName: 'A',
      status: 'ACTIVE',
    },
    update: {},
  })

  const memberB = await prisma.member.upsert({
    where: { id: `e2e-member-b-${orgBTenant.id}` },
    create: {
      id: `e2e-member-b-${orgBTenant.id}`,
      tenantId: orgBTenant.id,
      email: TEST_AUTH_USERS['e2e-user-b'].email,
      firstName: 'E2E User',
      lastName: 'B',
      status: 'ACTIVE',
    },
    update: {},
  })

  // Ensure a free membership tier exists for org-b (required by workflow test)
  const freeTierB = await prisma.membershipTier.upsert({
    where: { id: `e2e-tier-free-${orgBTenant.id}` },
    create: {
      id: `e2e-tier-free-${orgBTenant.id}`,
      tenantId: orgBTenant.id,
      name: 'Free Member',
      priceCents: 0,
      isActive: true,
    },
    update: { isActive: true },
  })

  // Ensure a published event exists for org-b (required by portal/events and workflow test)
  const eventB = await prisma.event.upsert({
    where: { id: `e2e-event-${orgBTenant.id}` },
    create: {
      id: `e2e-event-${orgBTenant.id}`,
      tenantId: orgBTenant.id,
      title: 'E2E Test Event',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
    },
    update: { status: 'PUBLISHED' },
  })

  const record: Record<E2EFixtureKey, E2EFixtureRecord> = {
    userA: { ...E2E_FIXTURES.userA, tenantIds: [orgATenant.id], memberIds: [memberA.id] },
    userB: { ...E2E_FIXTURES.userB, tenantIds: [orgBTenant.id], memberIds: [memberB.id], eventIds: [eventB.id] },
    userC: { ...E2E_FIXTURES.userC, tenantIds: [orgC1Tenant.id, orgC2Tenant.id] },
    userD: { ...E2E_FIXTURES.userD, tenantIds: [] },
  }

  await saveE2EFixtureRecord(record)
  return record
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

export function testAuthCookieForUser(userId: string, email: string) {
  return encodeURIComponent(JSON.stringify({ userId, email }))
}
