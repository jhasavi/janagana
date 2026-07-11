import { getUserClerkOrganizations } from "@/lib/auth/clerk-orgs";
import { clerkOrgRoleLabel, isClerkOrgAdminRole } from "@/lib/auth/clerk-roles";
import type { MappedTenant } from "@/lib/tenant";

export type DashboardAccess = {
  orgRole: string;
  canWrite: boolean;
  roleLabel: string;
};

export async function getDashboardAccessForTenant(tenant: MappedTenant): Promise<DashboardAccess> {
  const orgs = await getUserClerkOrganizations();
  const membership = orgs.find((org) => org.clerkOrgId === tenant.clerkOrgId);
  const orgRole = membership?.role ?? "org:member";
  return {
    orgRole,
    canWrite: isClerkOrgAdminRole(orgRole),
    roleLabel: clerkOrgRoleLabel(orgRole),
  };
}

export async function resolveOrgRoleForTenant(clerkOrgId: string): Promise<string> {
  const orgs = await getUserClerkOrganizations();
  return orgs.find((org) => org.clerkOrgId === clerkOrgId)?.role ?? "org:member";
}
