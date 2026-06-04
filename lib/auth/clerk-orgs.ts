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
  const pageSize = 100;
  let offset = 0;
  let allMemberships: Array<{
    organization: { id: string; name: string; slug?: string | null };
    role: string;
  }> = [];

  while (true) {
    const page = await client.users.getOrganizationMembershipList({
      userId,
      limit: pageSize,
      offset,
    });

    allMemberships = allMemberships.concat(page.data);
    if (page.data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return allMemberships.map((membership) => ({
    clerkOrgId: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug ?? null,
    role: membership.role,
  }));
}
