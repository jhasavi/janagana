import { clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findMappedTenantsForUser, setActiveTenantCookie } from "@/lib/tenant";

export default async function CreateOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const mappedTenants = await findMappedTenantsForUser();
  if (mappedTenants.length === 1) {
    console.info("DASHBOARD_TENANT_RESOLVED", { source: "onboarding-single-tenant", tenantId: mappedTenants[0].id });
    redirect("/dashboard");
  }
  if (mappedTenants.length > 1) {
    redirect("/select-organization");
  }

  async function createOrganizationAction(formData: FormData) {
    "use server";

    // SECURITY WARNING: Public registration must never call this flow.
    // This route is the only v3 path allowed to create a Clerk Organization.
    const current = await getCurrentUser();
    if (!current) {
      redirect("/sign-in");
    }

    const orgName = String(formData.get("orgName") ?? "").trim();
    const orgSlug = String(formData.get("orgSlug") ?? "").trim().toLowerCase();
    const ownerIntent = String(formData.get("ownerIntent") ?? "") === "yes";

    if (!ownerIntent) {
      redirect("/onboarding/create-organization?error=owner-intent-required");
    }

    if (orgName.length < 2 || !/^[a-z0-9-]{2,60}$/.test(orgSlug)) {
      redirect("/onboarding/create-organization?error=invalid-input");
    }

    const existingSlug = await prisma.tenant.findUnique({ where: { slug: orgSlug } });
    if (existingSlug) {
      redirect("/onboarding/create-organization?error=slug-exists");
    }

    const client = await clerkClient();
    let createdOrgId: string | null = null;

    try {
      const organization = await client.organizations.createOrganization({
        name: orgName,
        slug: orgSlug,
        createdBy: current.id,
      });
      console.info("CREATED_CLERK_ORG", {
        orgId: organization.id,
        slug: orgSlug,
      });
      createdOrgId = organization.id;

      const tenant = await prisma.tenant.create({
        data: {
          name: orgName,
          slug: orgSlug,
          clerkOrgId: organization.id,
          tenantAdmins: {
            create: {
              clerkUserId: current.id,
              role: "owner",
            },
          },
        },
      });
      console.info("CREATED_TENANT", {
        tenantId: tenant.id,
        slug: tenant.slug,
      });

      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: current.id,
          action: "CREATE",
          metadata: { entity: "Tenant", source: "owner_onboarding" },
        },
      });

      await setActiveTenantCookie(tenant.id);
      console.info("SET_ACTIVE_TENANT", { tenantId: tenant.id, source: "onboarding-create-org" });
      redirect("/dashboard");
    } catch (error) {
      console.info("DASHBOARD_TENANT_FAILED", {
        reason: "CREATE_ORG_FAILED",
        hasCreatedClerkOrg: Boolean(createdOrgId),
      });
      if (createdOrgId) {
        try {
          await client.organizations.deleteOrganization(createdOrgId);
        } catch {
          // Best-effort cleanup; onboarding error is surfaced below.
        }
      }
      redirect("/onboarding/create-organization?error=create-failed");
    }
  }

  const params = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Create organization</h1>
      <p className="mt-2 text-sm text-gray-600">
        Create your admin workspace. This is the only route that creates Clerk organizations.
      </p>

      {params.error && (
        <p className="mt-4 text-sm text-red-700">Unable to create organization. Please verify inputs and try again.</p>
      )}

      <form action={createOrganizationAction} className="mt-6 space-y-4 rounded-md border border-gray-200 bg-white p-4">
        <div>
          <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">Organization name</label>
          <input
            id="orgName"
            name="orgName"
            required
            minLength={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Namaste Boston"
          />
        </div>
        <div>
          <label htmlFor="orgSlug" className="block text-sm font-medium text-gray-700">Organization slug</label>
          <input
            id="orgSlug"
            name="orgSlug"
            required
            pattern="[a-z0-9-]{2,60}"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="namaste-boston"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" name="ownerIntent" value="yes" className="mt-1" required />
          <span>I confirm I am intentionally creating an owner organization workspace.</span>
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
            Create organization
          </button>
          <Link href="/sign-in" className="text-sm text-gray-700 underline">Back to sign in</Link>
        </div>
      </form>
    </main>
  );
}
