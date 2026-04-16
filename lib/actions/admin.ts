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

type TenantOwner = {
  identifier: string
  role: string
}

type TenantWithOwners = Tenant & {
  _count: {
    members: number
    events: number
    volunteerOpportunities: number
  }
  owners: TenantOwner[]
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
          .map((membership) => ({
            identifier:
              membership.publicUserData?.identifier || String(membership.role),
            role: String(membership.role),
          }))

        return { ...tenant, owners }
      } catch (error) {
        return { ...tenant, owners: [] }
      }
    })
  )

  return tenantsWithOwners
}
