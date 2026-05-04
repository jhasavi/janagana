'use server'

import { clerkClient, currentUser } from '@clerk/nextjs/server'
import type { Tenant } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { adminEnvironmentAllowed } from '@/lib/permissions-policy'
import { logPlatformAudit } from '@/lib/actions/audit'

const GLOBAL_ADMIN_EMAILS = (process.env.GLOBAL_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export async function requireGlobalAdmin() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const currentEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development'
  if (!adminEnvironmentAllowed()) {
    console.warn('[admin] environment not allowed for global admin operations', {
      authPrincipal: `clerk:user:${user.id}`,
      appEnv: currentEnv,
    })
    await logPlatformAudit({
      action: 'DELETE',
      resourceType: 'PlatformAdminAccess',
      resourceId: user.id,
      resourceName: 'environment_blocked',
      actorClerkId: user.id,
      metadata: {
        appEnv: currentEnv,
        reason: 'environment_not_allowed',
      },
    })
    return null
  }

  const email = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress?.toLowerCase()

  if (!email || !GLOBAL_ADMIN_EMAILS.includes(email)) {
    console.warn('[admin] denied global admin access', {
      authPrincipal: `clerk:user:${user.id}`,
      email: email ?? null,
      appEnv: currentEnv,
    })
    await logPlatformAudit({
      action: 'DELETE',
      resourceType: 'PlatformAdminAccess',
      resourceId: user.id,
      resourceName: 'allowlist_denied',
      actorClerkId: user.id,
      metadata: {
        appEnv: currentEnv,
        email: email ?? null,
      },
    })
    return null
  }

  console.log('[admin] granted global admin access', {
    authPrincipal: `clerk:user:${user.id}`,
    email,
    appEnv: currentEnv,
  })
  await logPlatformAudit({
    action: 'CREATE',
    resourceType: 'PlatformAdminAccess',
    resourceId: user.id,
    resourceName: 'granted',
    actorClerkId: user.id,
    metadata: {
      appEnv: currentEnv,
      email,
    },
  })

  return user
}

export type TenantOwner = {
  identifier: string
  role: string
  fullName?: string
  email?: string
}

type TenantWithOwners = Tenant & {
  _count: {
    members: number
    events: number
    volunteerOpportunities: number
  }
  owners: TenantOwner[]
}

function getMembershipPrimaryEmail(membership: any): string | undefined {
  return (
    membership?.emailAddresses?.[0]?.emailAddress ??
    membership?.emailAddress ??
    membership?.primaryEmailAddress?.emailAddress ??
    membership?.publicUserData?.email ??
    membership?.public_user_data?.email ??
    membership?.user?.emailAddress
  )
}

function getMembershipFullName(membership: any): string | undefined {
  const firstName =
    membership?.publicUserData?.firstName ??
    membership?.publicUserData?.first_name ??
    membership?.public_user_data?.first_name ??
    membership?.firstName ??
    membership?.first_name ??
    membership?.user?.firstName ??
    membership?.user?.first_name

  const lastName =
    membership?.publicUserData?.lastName ??
    membership?.publicUserData?.last_name ??
    membership?.public_user_data?.last_name ??
    membership?.lastName ??
    membership?.last_name ??
    membership?.user?.lastName ??
    membership?.user?.last_name

  const fallbackName =
    membership?.publicUserData?.name ??
    membership?.public_user_data?.name ??
    membership?.user?.fullName ??
    membership?.user?.name

  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  return fullName || fallbackName
}

export async function getAllTenants(): Promise<TenantWithOwners[]> {
  const admin = await requireGlobalAdmin()
  if (!admin) {
    redirect('/dashboard')
  }

  console.log('[admin] list tenants', {
    authPrincipal: `clerk:user:${admin.id}`,
    route: '/admin',
    appEnv: process.env.APP_ENV || process.env.NODE_ENV || 'development',
  })

  await logPlatformAudit({
    action: 'UPDATE',
    resourceType: 'PlatformTenants',
    resourceId: 'all',
    resourceName: 'list',
    actorClerkId: admin.id,
    metadata: {
      appEnv: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    },
  })

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          members: true,
          events: true,
          volunteerOpportunities: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const tenantsWithOwners = await Promise.all(
    tenants.map(async (tenant): Promise<TenantWithOwners> => {
      try {
        const client = await clerkClient()
        const memberships = await client.organizations.getOrganizationMembershipList({
          organizationId: tenant.clerkOrgId,
          limit: 10,
        })

        const owners = memberships.data
          .filter((membership) =>
            ['org:admin', 'org:owner'].some((role) =>
              String(membership.role).toLowerCase().includes(role.replace('org:', ''))
            )
          )
          .map((membership) => {
            const rawMembership = membership as any
            const fullName = getMembershipFullName(rawMembership)
            const email = getMembershipPrimaryEmail(rawMembership)
            const identifier =
              fullName ||
              email ||
              rawMembership?.userId ||
              rawMembership?.user_id ||
              String(membership.role)

            return {
              identifier,
              role: String(membership.role),
              fullName,
              email,
            }
          })

        return { ...tenant, owners }
      } catch (error) {
        return { ...tenant, owners: [] }
      }
    })
  )

  return tenantsWithOwners
}
