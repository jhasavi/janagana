'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import type { Tenant } from '@prisma/client'
import { requireTenant } from '@/lib/tenant'

export interface TenantAdminAccess {
  success: true
  tenant: Tenant
  userId: string
  role: string
}

export interface TenantAdminDenied {
  success: false
  error: string
}

export async function requireTenantAdminAccess(
  actionName: string
): Promise<TenantAdminAccess | TenantAdminDenied> {
  try {
    const tenant = await requireTenant()
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Not authenticated' }
    }

    const client = await clerkClient()
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: tenant.clerkOrgId,
      userId: [userId],
      limit: 1,
    })

    const membership = memberships.data[0]
    if (!membership) {
      return { success: false, error: 'Access denied: not a member of this organization' }
    }

    const role = String(membership.role ?? '').toLowerCase()
    // Use exact match to prevent unintended role matches (e.g., "adminassistant")
    const isAdmin = role === 'admin' || role === 'owner'

    if (!isAdmin) {
      return { success: false, error: 'Access denied: admin role required' }
    }

    return { success: true, tenant, userId, role }
  } catch (error) {
    console.error(`[requireTenantAdminAccess:${actionName}]`, error)
    return { success: false, error: 'Access check failed' }
  }
}