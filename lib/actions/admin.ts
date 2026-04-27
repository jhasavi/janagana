'use server'

import { clerkClient, currentUser } from '@clerk/nextjs/server'
import type { Tenant } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const GLOBAL_ADMIN_EMAILS = (process.env.GLOBAL_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export async function requireGlobalAdmin() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const email = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress?.toLowerCase()

  if (!email || !GLOBAL_ADMIN_EMAILS.includes(email)) {
    return null
  }
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
