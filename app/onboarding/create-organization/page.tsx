import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
import { setupExistingClerkOrgAsTenant } from "@/lib/actions/onboarding";
import { prisma } from "@/lib/prisma";
import { findMappedTenantsForUser, setActiveTenantCookie } from "@/lib/tenant";
import { createRequestId } from "@/lib/utils";

type OnboardingErrorCode =
  | "owner-intent-required"
  | "invalid-input"
  | "slug-exists"
  | "clerk-org-exists"
  | "clerk-create-failed"
  | "db-create-failed"
  | "db-create-recovery-required"
  | "invalid-clerk-org"
  | "not-a-member"
  | "tenant-already-mapped"
  | "setup-existing-failed";

function shortId(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function toSafeErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) return null;
  const map: Record<OnboardingErrorCode, string> = {
    "owner-intent-required": "You must confirm owner intent to create a new organization.",
    "invalid-input": "Organization name or slug is invalid.",
    "slug-exists": "This slug is already used.",
    "clerk-org-exists": "You already have a Clerk organization with this name or slug. Use Set up existing organization instead.",
    "clerk-create-failed": "Clerk organization creation failed.",
    "db-create-failed": "Database tenant creation failed.",
    "db-create-recovery-required": "Tenant creation partially failed. Use Existing organization setup to map the newly created Clerk organization.",
    "invalid-clerk-org": "Invalid organization selection.",
    "not-a-member": "You must belong to the selected Clerk organization.",
    "tenant-already-mapped": "This Clerk organization is already set up in JanaGana.",
    "setup-existing-failed": "Setting up the existing Clerk organization failed.",
  };
  return map[errorCode as OnboardingErrorCode] ?? "Onboarding failed. Please retry.";
}

export default async function CreateOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; requestId?: string; clerkOrgId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const mappedTenants = await findMappedTenantsForUser();
  const clerkOrganizations = await getUserClerkOrganizations();
  const mappedOrgIds = new Set(mappedTenants.map((tenant) => tenant.clerkOrgId));
  const unmappedClerkOrgs = clerkOrganizations.filter((org) => !mappedOrgIds.has(org.clerkOrgId));

  if (mappedTenants.length > 1) {
    redirect("/select-organization");
  }

  async function createOrganizationAction(formData: FormData) {
    "use server";
    const requestId = createRequestId();

    // SECURITY WARNING: Public registration must never call this flow.
    // This route is the only v3 path allowed to create a Clerk Organization.
    const current = await getCurrentUser();
    if (!current) {
      redirect("/sign-in");
    }

    const orgName = String(formData.get("orgName") ?? "").trim();
    const orgSlug = String(formData.get("orgSlug") ?? "").trim().toLowerCase();
    const ownerIntent = String(formData.get("ownerIntent") ?? "") === "yes";
    const memberships = await getUserClerkOrganizations();

    console.info("CREATE_ORG_SUBMIT", {
      requestId,
      userId: shortId(current.id),
      clerkMembershipCount: memberships.length,
      submittedOrgName: orgName,
      submittedOrgSlug: orgSlug,
    });

    if (!ownerIntent) {
      redirect("/onboarding/create-organization?error=owner-intent-required");
    }

    if (orgName.length < 2 || !/^[a-z0-9-]{2,60}$/.test(orgSlug)) {
      redirect("/onboarding/create-organization?error=invalid-input");
    }

    const existingSlug = await prisma.tenant.findUnique({ where: { slug: orgSlug } });
    console.info("CREATE_ORG_DB_SLUG_CHECK", {
      requestId,
      submittedOrgSlug: orgSlug,
      tenantSlugExists: Boolean(existingSlug),
    });
    if (existingSlug) {
      redirect("/onboarding/create-organization?error=slug-exists");
    }

    const hasMatchingMembership = memberships.some(
      (org) => (org.slug && org.slug.toLowerCase() === orgSlug) || org.name.toLowerCase() === orgName.toLowerCase(),
    );
    console.info("CREATE_ORG_CLERK_MEMBERSHIP_MATCH", {
      requestId,
      submittedOrgName: orgName,
      submittedOrgSlug: orgSlug,
      clerkOrgSlugOrNameExistsInMemberships: hasMatchingMembership,
    });
    if (hasMatchingMembership) {
      redirect("/onboarding/create-organization?error=clerk-org-exists");
    }

    const client = await clerkClient();
    let createdOrgId: string | null = null;

    try {
      const allowClerkSlug = process.env.CLERK_ENABLE_ORG_SLUGS === "true";
      const organization = await client.organizations.createOrganization(
        allowClerkSlug
          ? {
              name: orgName,
              slug: orgSlug,
              createdBy: current.id,
            }
          : {
              name: orgName,
              createdBy: current.id,
            },
      );
      console.info("CREATED_CLERK_ORG", {
        requestId,
        orgId: organization.id,
        submittedSlug: orgSlug,
        clerkSlug: organization.slug ?? null,
        mode: allowClerkSlug ? "with-slug" : "name-only",
      });
      createdOrgId = organization.id;

      let tenantIdForRollback: string | null = null;
      try {
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
        tenantIdForRollback = tenant.id;
        console.info("CREATED_TENANT", {
          requestId,
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
      } catch (error: any) {
        if (String(error?.message ?? "").includes("NEXT_REDIRECT")) {
          throw error;
        }
        let cleanupFailed = false;
        console.info("DB_TENANT_CREATE_FAILED", {
          requestId,
          userId: shortId(current.id),
          submittedOrgSlug: orgSlug,
          clerkOrgId: organization.id,
          dbCreationFailed: true,
          errorCode: error?.code ?? "unknown",
          message: error?.message ?? "unknown",
          hasRollbackTenantId: Boolean(tenantIdForRollback),
        });
        if (createdOrgId) {
          try {
            await client.organizations.deleteOrganization(createdOrgId);
          } catch {
            // Best-effort cleanup of orphaned Clerk org.
            cleanupFailed = true;
          }
        }
        if (cleanupFailed && createdOrgId) {
          redirect(`/onboarding/create-organization?error=db-create-recovery-required&clerkOrgId=${encodeURIComponent(createdOrgId)}&requestId=${encodeURIComponent(requestId)}`);
        }
        redirect(`/onboarding/create-organization?error=db-create-failed&requestId=${encodeURIComponent(requestId)}`);
      }
    } catch (error: any) {
      if (String(error?.message ?? "").includes("NEXT_REDIRECT")) {
        throw error;
      }
      const code = String(error?.code ?? "").toLowerCase();
      const message = String(error?.message ?? "").toLowerCase();
      const clerkOrgExists =
        code.includes("already_exists") ||
        code.includes("duplicate") ||
        message.includes("already exists") ||
        message.includes("slug") ||
        message.includes("name");
      const slugsDisabled = code.includes("organization_slugs_disabled") || message.includes("organization_slugs_disabled");

      console.info("DASHBOARD_TENANT_FAILED", {
        requestId,
        reason: "CREATE_ORG_FAILED",
        userId: shortId(current.id),
        submittedOrgName: orgName,
        submittedOrgSlug: orgSlug,
        clerkOrgCreationFailed: true,
        clerkOrgSlugOrNameAlreadyExists: clerkOrgExists,
        clerkOrgSlugsDisabled: slugsDisabled,
        hasCreatedClerkOrg: Boolean(createdOrgId),
        errorCode: error?.code ?? "unknown",
        message: error?.message ?? "unknown",
      });
      if (createdOrgId) {
        try {
          await client.organizations.deleteOrganization(createdOrgId);
        } catch {
          // Best-effort cleanup; onboarding error is surfaced below.
        }
      }
      redirect(`/onboarding/create-organization?error=${clerkOrgExists ? "clerk-org-exists" : "clerk-create-failed"}&requestId=${encodeURIComponent(requestId)}`);
    }
  }

  async function setupExistingClerkOrgAsTenantAction(formData: FormData) {
    "use server";
    const clerkOrgId = String(formData.get("clerkOrgId") ?? "").trim();
    await setupExistingClerkOrgAsTenant(clerkOrgId);
  }

  const params = await searchParams;
  const safeError = toSafeErrorMessage(params.error);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Set up organization</h1>
      <p className="mt-2 text-sm text-gray-600">
        Finish onboarding by setting up an existing Clerk organization or creating a new owner organization.
      </p>

      {mappedTenants.length === 1 && (
        <p className="mt-3 text-sm text-gray-700">
          Current organization: <span className="font-medium">{mappedTenants[0].name}</span>. You can create another organization below.
        </p>
      )}

      {safeError && (
        <p className="mt-4 text-sm text-red-700">{safeError}</p>
      )}

      {params.error === "db-create-recovery-required" && params.clerkOrgId && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Recovery required:</p>
          <p>
            We could not fully roll back a partially-created Clerk organization.
            Use <span className="font-medium">Existing organization setup</span> below to map it into JanaGana.
          </p>
          {params.requestId && <p className="mt-1">Reference: {params.requestId}</p>}
        </div>
      )}

      {unmappedClerkOrgs.length > 0 && (
        <section className="mt-6 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Existing organization setup</h2>
          <p className="mt-1 text-sm text-gray-600">
            You already belong to these organizations in Clerk. Set one up in JanaGana.
          </p>
          <div className="mt-4 space-y-3">
            {unmappedClerkOrgs.map((org) => (
              <form key={org.clerkOrgId} action={setupExistingClerkOrgAsTenantAction} className="rounded-md border border-gray-200 p-3">
                <input type="hidden" name="clerkOrgId" value={org.clerkOrgId} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-500">
                      {org.role} · {shortId(org.clerkOrgId)}
                    </p>
                  </div>
                  <button type="submit" className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black">
                    Set up {org.name}
                  </button>
                </div>
              </form>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Create a new owner organization</h2>
        <p className="mt-1 text-sm text-gray-600">Only use this if your Clerk organization does not already exist.</p>

        <form action={createOrganizationAction} className="mt-4 space-y-4">
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
        </div>
        </form>
        <form action="/api/sign-out" method="POST" className="mt-3">
          <button type="submit" className="text-sm text-gray-700 underline">Sign out</button>
        </form>
      </section>
    </main>
  );
}
