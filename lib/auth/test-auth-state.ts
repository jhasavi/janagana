import { slugify } from '@/lib/utils'

export type TestAuthUser = {
  userId: string
  email: string
}

type TestAuthMembershipState = {
  orgIds: string[]
}

type TestAuthState = {
  memberships: Record<string, TestAuthMembershipState>
}

type GlobalTestAuthState = typeof globalThis & {
  __JG_TEST_AUTH_STATE__?: TestAuthState
}

export const TEST_AUTH_COOKIE_NAME = 'JG_TEST_AUTH'

export const TEST_AUTH_USERS: Record<string, TestAuthUser> = {
  'e2e-user-a': { userId: 'e2e-user-a', email: 'e2e-user-a@example.com' },
  'e2e-user-b': { userId: 'e2e-user-b', email: 'e2e-user-b@example.com' },
  'e2e-user-c': { userId: 'e2e-user-c', email: 'e2e-user-c@example.com' },
  'e2e-user-d': { userId: 'e2e-user-d', email: 'e2e-user-d@example.com' },
}

export const TEST_AUTH_ORGS = {
  orgA: { orgId: 'e2e-org-a', name: 'E2E Org A' },
  orgB: { orgId: 'e2e-org-b', name: 'E2E Org B' },
  orgC1: { orgId: 'e2e-org-c1', name: 'E2E Org C1' },
  orgC2: { orgId: 'e2e-org-c2', name: 'E2E Org C2' },
} as const

function defaultState(): TestAuthState {
  return {
    memberships: {
      'e2e-user-a': { orgIds: [TEST_AUTH_ORGS.orgA.orgId] },
      'e2e-user-b': { orgIds: [TEST_AUTH_ORGS.orgB.orgId] },
      'e2e-user-c': { orgIds: [TEST_AUTH_ORGS.orgC1.orgId, TEST_AUTH_ORGS.orgC2.orgId] },
      'e2e-user-d': { orgIds: [] },
    },
  }
}

function getState(): TestAuthState {
  const globalState = globalThis as GlobalTestAuthState
  if (!globalState.__JG_TEST_AUTH_STATE__) {
    globalState.__JG_TEST_AUTH_STATE__ = defaultState()
  }
  return globalState.__JG_TEST_AUTH_STATE__
}

function getRuntimeEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } })?.process?.env?.[name]
}

function isRuntimeProduction() {
  return getRuntimeEnv('NODE_ENV') === 'production'
}

function hasTestModeFlags() {
  return getRuntimeEnv('PLAYWRIGHT_TEST') === 'true' || getRuntimeEnv('E2E_TEST_MODE') === 'true'
}

export function isTestAuthEnabled() {
  if (isRuntimeProduction()) return false
  const testFlags = hasTestModeFlags()
  return getRuntimeEnv('NODE_ENV') === 'test' || testFlags
}

export function assertTestAuthAllowed() {
  if (isRuntimeProduction()) {
    throw new Error('Test auth is disabled in production')
  }
  if (!isTestAuthEnabled()) {
    throw new Error('Test auth requires NODE_ENV=test, PLAYWRIGHT_TEST=true, or E2E_TEST_MODE=true')
  }
}

export function resetTestAuthState() {
  const globalState = globalThis as GlobalTestAuthState
  globalState.__JG_TEST_AUTH_STATE__ = defaultState()
}

export function parseTestAuthCookie(value: string | undefined) {
  if (!value) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as { userId?: string; email?: string }
    if (!parsed.userId || !parsed.email) return null
    return { userId: parsed.userId, email: parsed.email }
  } catch {
    return null
  }
}

export function encodeTestAuthCookie(identity: TestAuthUser) {
  return encodeURIComponent(JSON.stringify(identity))
}

export function getTestUserIdentity(userId: string | null | undefined) {
  if (!userId) return null
  return TEST_AUTH_USERS[userId] ?? null
}

export function getTestMembershipOrgIds(userId: string | null | undefined) {
  if (!userId) return []
  return getState().memberships[userId]?.orgIds ?? []
}

export function getTestMemberships(userId: string | null | undefined) {
  if (!userId) return []
  return getTestMembershipOrgIds(userId).map((orgId) => {
    const org = Object.values(TEST_AUTH_ORGS).find((entry) => entry.orgId === orgId)
    return {
      organization: {
        id: orgId,
        name: org?.name ?? `Test Org ${slugify(orgId)}`,
        slug: slugify(org?.name ?? orgId),
        imageUrl: null,
      },
      role: 'admin',
    }
  })
}

export function userBelongsToTestOrganization(userId: string | null | undefined, orgId: string) {
  if (!userId) return false
  return getTestMembershipOrgIds(userId).includes(orgId)
}

export function setTestMemberships(userId: string, orgIds: string[]) {
  const state = getState()
  state.memberships[userId] = { orgIds: [...orgIds] }
}

export function addTestMembership(userId: string, orgId: string) {
  const state = getState()
  const current = new Set(state.memberships[userId]?.orgIds ?? [])
  current.add(orgId)
  state.memberships[userId] = { orgIds: [...current] }
}

export function removeTestMembership(userId: string, orgId: string) {
  const state = getState()
  const current = new Set(state.memberships[userId]?.orgIds ?? [])
  current.delete(orgId)
  state.memberships[userId] = { orgIds: [...current] }
}

export function getTestAuthIdentityFromCookies(cookieValue: string | undefined) {
  if (!isTestAuthEnabled()) return null
  return parseTestAuthCookie(cookieValue)
}
