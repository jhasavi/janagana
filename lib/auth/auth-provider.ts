import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import {
  addTestMembership,
  assertTestAuthAllowed,
  getTestAuthIdentityFromCookies,
  getTestMemberships,
  isTestAuthEnabled,
  userBelongsToTestOrganization,
} from './test-auth-state'

export type AppIdentity = {
  userId: string | null
  email: string | null
  orgId: string | null
  mode: 'clerk' | 'test' | 'anonymous'
}

export type AppOrgMembership = {
  organization: {
    id: string
    name: string
    slug: string
    imageUrl: string | null
  }
  role: string
}

function ensureTestMode() {
  assertTestAuthAllowed()
  return true
}

async function getTestIdentityFromCookies() {
  if (!isTestAuthEnabled()) return null
  ensureTestMode()
  const cookieStore = await cookies()
  const identityCookie = cookieStore.get('JG_TEST_AUTH')?.value
  const identity = getTestAuthIdentityFromCookies(identityCookie)
  if (!identity) return null
  const orgId = cookieStore.get('JG_ACTIVE_ORG')?.value ?? null
  return {
    userId: identity.userId,
    email: identity.email,
    orgId,
    mode: 'test' as const,
  }
}

export async function getCurrentIdentity(): Promise<AppIdentity> {
  if (isTestAuthEnabled()) {
    const testIdentity = await getTestIdentityFromCookies()
    if (testIdentity) return testIdentity
    return { userId: null, email: null, orgId: null, mode: 'anonymous' }
  }

  const clerkIdentity = await auth()
  const clerkUser = clerkIdentity.userId ? await currentUser().catch(() => null) : null
  return {
    userId: clerkIdentity.userId ?? null,
    email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? clerkUser?.primaryEmailAddress?.emailAddress ?? null,
    orgId: clerkIdentity.orgId ?? null,
    mode: clerkIdentity.userId ? 'clerk' : 'anonymous',
  }
}

export async function requireAuthenticatedUser() {
  const identity = await getCurrentIdentity()
  if (!identity.userId) {
    throw new Error('Unauthorized')
  }
  return identity
}

export async function getUserOrgMemberships(userId: string): Promise<AppOrgMembership[]> {
  if (isTestAuthEnabled()) {
    ensureTestMode()
    return getTestMemberships(userId)
  }

  const client = await clerkClient()
  const memberships = await client.users.getOrganizationMembershipList({
    userId,
    limit: 100,
  })

  return memberships.data.map((membership) => ({
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug ?? '',
      imageUrl: membership.organization.imageUrl ?? null,
    },
    role: membership.role,
  }))
}

export async function userBelongsToOrg(userId: string | null, orgId: string) {
  if (!userId) return false
  if (isTestAuthEnabled()) {
    ensureTestMode()
    return userBelongsToTestOrganization(userId, orgId)
  }

  try {
    const client = await clerkClient()
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      userId: [userId],
      limit: 1,
    })
    return memberships.data.length > 0
  } catch {
    return false
  }
}

export function isAppTestAuthEnabled() {
  return isTestAuthEnabled()
}

export async function setActiveOrgCookies(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }, orgId: string, tenantId: string | null) {
  response.cookies.set('JG_ACTIVE_ORG', orgId, {
    path: '/',
    maxAge: 3600,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  if (tenantId) {
    response.cookies.set('JG_TENANT_ID', tenantId, {
      path: '/',
      maxAge: 3600,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  } else {
    response.cookies.set('JG_TENANT_ID', '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  }
}

export async function clearActiveOrgCookies(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }) {
  response.cookies.set('JG_ACTIVE_ORG', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  response.cookies.set('JG_TENANT_ID', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  response.cookies.set('JG_TEST_AUTH', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}

export async function createTestOnboardingTenant(userId: string, orgName: string, tenantData: { slug: string; timezone: string; primaryColor: string }) {
  ensureTestMode()
  const orgId = `test-org-${orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
  const existing = await prisma.tenant.findUnique({ where: { clerkOrgId: orgId } })
  const tenant = existing
    ? await prisma.tenant.update({
        where: { id: existing.id },
        data: {
          name: orgName,
          slug: tenantData.slug,
          timezone: tenantData.timezone,
          primaryColor: tenantData.primaryColor,
        },
      })
    : await prisma.tenant.create({
        data: {
          clerkOrgId: orgId,
          name: orgName,
          slug: tenantData.slug,
          timezone: tenantData.timezone,
          primaryColor: tenantData.primaryColor,
        },
      })

  addTestMembership(userId, orgId)
  return { orgId, tenant }
}
