import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { OrgFlowRole, Permission, ROLE_PRESETS, RoleType } from '@orgflow/types';

export interface AuthenticatedUser {
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: OrgFlowRole;
  tenantId: string | null;
}

export interface AuthenticatedMember {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  tenantId: string | null;
}

// ─── Server-component helpers ─────────────────────────────────────────────────

/**
 * Returns the currently signed-in Clerk user shaped as AuthenticatedUser,
 * or null if no session exists. Safe to call from Server Components.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const user = await currentUser();
  if (!user) return null;

  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const role = (metadata.role as OrgFlowRole | undefined) ?? 'readonly';
  const tenantId = (metadata.tenantId as string | undefined) ?? null;

  const primaryEmail =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ?? '';

  return {
    clerkId: user.id,
    email: primaryEmail,
    fullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    avatarUrl: user.imageUrl || null,
    role,
    tenantId,
  };
}

/**
 * Returns the currently signed-in member (lower-privilege portal user), or
 * null if no session exists.
 */
export async function getCurrentMember(): Promise<AuthenticatedMember | null> {
  const user = await currentUser();
  if (!user) return null;

  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const tenantId = (metadata.tenantId as string | undefined) ?? null;

  const primaryEmail =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ?? '';

  return {
    clerkId: user.id,
    email: primaryEmail,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    avatarUrl: user.imageUrl || null,
    tenantId,
  };
}

/**
 * Asserts the request is authenticated.
 * Redirects to /sign-in if not. Use in Server Components and Server Actions.
 */
export async function requireAuth(): Promise<{ userId: string; sessionId: string }> {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) redirect('/sign-in');
  return { userId, sessionId };
}

/**
 * Asserts the current user is an admin or owner of the tenant.
 * Redirects to /sign-in or throws 403 when conditions are not met.
 */
export async function requireTenantAdmin(): Promise<AuthenticatedUser> {
  await requireAuth();
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  if (user.role !== 'admin' && user.role !== 'owner') {
    // Staff / readonly / members go back to the member portal
    redirect('/portal');
  }
  return user;
}

/**
 * Asserts the current user is a tenant member (any authenticated user with a tenantId).
 */
export async function requireMember(): Promise<AuthenticatedMember> {
  const { userId, sessionId } = await auth();
  if (userId && sessionId) {
    const member = await getCurrentMember();
    if (member && member.tenantId) {
      return member;
    }
  }

  const token = cookies().get('memberToken')?.value;
  if (token) {
    const apiRoot = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
    if (apiRoot) {
      try {
        const url = `${apiRoot.replace(/\/$/, '')}/api/v1/auth/members/me`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const body = (await res.json()) as AuthenticatedMember;
          if (body && body.tenantId) {
            return body;
          }
        }
      } catch (error) {
        // Fall through to redirect
      }
    }
  }

  redirect('/member-login');
}

// ─── Permission helpers ───────────────────────────────────────────────────────

/**
 * Returns the Clerk role from public metadata.
 */
export function getRoleFromPublicMetadata(metadata: Record<string, unknown> | null | undefined): OrgFlowRole {
  return (metadata?.role as OrgFlowRole | undefined) ?? 'readonly';
}

/**
 * Maps OrgFlowRole (lowercase) to RoleType (uppercase)
 */
function mapOrgFlowRoleToRoleType(role: OrgFlowRole): RoleType {
  const mapping: Record<OrgFlowRole, RoleType> = {
    owner: 'OWNER',
    admin: 'ADMIN',
    staff: 'STAFF',
    readonly: 'READONLY',
    member: 'CUSTOM',
  };
  return mapping[role] ?? 'CUSTOM';
}

/**
 * Returns true when the given role includes the specified permission.
 */
export function hasPermission(role: OrgFlowRole, permission: Permission): boolean {
  const roleType = mapOrgFlowRoleToRoleType(role);
  return ROLE_PRESETS[roleType]?.includes(permission) ?? false;
}

/**
 * Returns true when the user has the specified permission based on their role.
 */
export function userHasPermission(user: AuthenticatedUser, permission: Permission): boolean {
  return hasPermission(user.role, permission);
}

/**
 * Returns all permissions for a given role.
 */
export function getPermissions(role: OrgFlowRole): Permission[] {
  const roleType = mapOrgFlowRoleToRoleType(role);
  return ROLE_PRESETS[roleType] ?? [];
}
