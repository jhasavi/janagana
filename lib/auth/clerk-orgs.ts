import { auth, clerkClient } from "@clerk/nextjs/server";

export type ClerkOrganizationSummary = {
  clerkOrgId: string;
  name: string;
  slug: string | null;
  role: string;
};

export async function getUserClerkOrganizations(): Promise<ClerkOrganizationSummary[]> {
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({
    userId,
    limit: 100,
  });

  return memberships.data.map((membership) => ({
    clerkOrgId: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug ?? null,
    role: membership.role,
  }));
}
