'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import type { Tenant } from '@prisma/client'
import { requireTenant } from '@/lib/tenant'
import {
  isAdminOrOwnerRole,
  ownerOnlyAction,
  roleCanPerformAction,
  type TenantActionPermission,
} from '@/lib/permissions-policy'

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

export interface TenantActionAccess {
  success: true
  tenant: Tenant
  userId: string
  role: string
}

export interface TenantActionDenied {
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

    const role = String(membership.role ?? '')
    const isAdmin = isAdminOrOwnerRole(role)

    if (!isAdmin) {
      return { success: false, error: 'Access denied: admin role required' }
    }

    return { success: true, tenant, userId, role }
  } catch (error) {
    console.error(`[requireTenantAdminAccess:${actionName}]`, error)
    return { success: false, error: 'Access check failed' }
  }
}

export async function requireTenantActionAccess(
  actionName: string,
  action: TenantActionPermission
): Promise<TenantActionAccess | TenantActionDenied> {
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

    const role = String(membership.role ?? '')
    if (!roleCanPerformAction(role, action)) {
      const permissionHint = ownerOnlyAction(action)
        ? 'owner role required'
        : 'admin or owner role required'
      return { success: false, error: `Access denied: ${permissionHint}` }
    }

    return { success: true, tenant, userId, role }
  } catch (error) {
    console.error(`[requireTenantActionAccess:${actionName}]`, error)
    return { success: false, error: 'Access check failed' }
  }
}