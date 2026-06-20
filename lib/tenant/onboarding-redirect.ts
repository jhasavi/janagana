import { redirect } from "next/navigation";
import { getUserClerkOrganizations } from "@/lib/auth";
import { findMappedTenantsForUser } from "@/lib/tenant/tenant-resolver";
import { currentClerkMode } from "@/lib/environment";

/**
 * Where to send signed-in users with no mapped JanaGana tenants.
 */
export async function redirectForZeroTenantAccess(): Promise<never> {
  const [clerkOrgs, mappedTenants] = await Promise.all([
    getUserClerkOrganizations(),
    findMappedTenantsForUser(),
  ]);

  if (clerkOrgs.length > 0 && mappedTenants.length === 0) {
    redirect("/onboarding/no-access");
  }

  redirect("/onboarding/create-organization");
}

export function isLocalClerkMode(): boolean {
  return currentClerkMode() === "test";
}
