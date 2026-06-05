import { clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
import { clerkOrgRoleLabel, isClerkOrgAdminRole } from "@/lib/auth/clerk-roles";
import { findClaimablePlaceholderTenant, setupExistingClerkOrgAsTenant } from "@/lib/actions/onboarding";
import { publicPortalUrl } from "@/lib/environment";
import { prisma } from "@/lib/prisma";
import { selfServeOnboardingEnabled } from "@/lib/pilot/dashboard-nav";
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
  | "insufficient-permission"
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
    "clerk-org-exists": "A Clerk organization with this name or slug already belongs to your account. JanaGana will not create a duplicate; ask the pilot admin to review the mapping.",
    "clerk-create-failed": "Clerk organization creation failed.",
    "db-create-failed": "Database tenant creation failed.",
    "db-create-recovery-required": "Tenant creation partially failed. Use Existing organization setup to map the newly created Clerk organization.",
    "invalid-clerk-org": "Invalid organization selection.",
    "not-a-member": "You must belong to the selected Clerk organization.",
    "insufficient-permission": "You must be an owner or admin in the selected Clerk organization to set it up in JanaGana.",
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

  const params = await searchParams;
  const mappedTenants = await findMappedTenantsForUser();
  const clerkOrganizations = await getUserClerkOrganizations();
  const existingOrgSetupEnabled = process.env.ENABLE_EXISTING_ORG_SETUP === "true";
  const selfServeEnabled = selfServeOnboardingEnabled();
  const mappedOrgIds = new Set(mappedTenants.map((tenant) => tenant.clerkOrgId));
  const unmappedClerkOrgs = clerkOrganizations.filter((org) => !mappedOrgIds.has(org.clerkOrgId));
  const eligibleClerkOrgs = unmappedClerkOrgs.filter((org) => isClerkOrgAdminRole(org.role));
  const blockedClerkOrgs = unmappedClerkOrgs.filter((org) => !isClerkOrgAdminRole(org.role));

  console.info("ONBOARDING_EXISTING_ORG_DIAGNOSTICS", {
    userId: shortId(user.id),
    clerkOrganizationCount: clerkOrganizations.length,
    mappedTenantCount: mappedTenants.length,
    unmappedClerkOrgCount: unmappedClerkOrgs.length,
    eligibleClerkOrgCount: eligibleClerkOrgs.length,
    blockedClerkOrgCount: blockedClerkOrgs.length,
    existingOrgSetupEnabled,
  });

  const shouldRedirectToSelectOrganization =
    mappedTenants.length > 1 &&
    unmappedClerkOrgs.length === 0 &&
    params.error !== "db-create-recovery-required";

  if (shouldRedirectToSelectOrganization) {
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
    const claimableTenant = existingSlug ? await findClaimablePlaceholderTenant(orgSlug) : null;
    console.info("CREATE_ORG_DB_SLUG_CHECK", {
      requestId,
      submittedOrgSlug: orgSlug,
      tenantSlugExists: Boolean(existingSlug),
      claimablePlaceholderTenant: Boolean(claimableTenant),
    });
    if (existingSlug && !claimableTenant) {
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
        const tenant = claimableTenant
          ? await prisma.tenant.update({
              where: { id: claimableTenant.id },
              data: {
                name: orgName,
                clerkOrgId: organization.id,
                tenantAdmins: {
                  create: {
                    clerkUserId: current.id,
                    role: "owner",
                  },
                },
              },
            })
          : await prisma.tenant.create({
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
        redirect(`/onboarding/complete?tenantId=${encodeURIComponent(tenant.id)}&source=create`);
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

  const safeError = toSafeErrorMessage(params.error);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm font-medium text-blue-700">JanaGana pilot</p>
      <h1 className="mt-1 text-2xl font-semibold">Community access</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Production pilot supports <strong>Namaste Boston</strong> and <strong>The Purple Wings</strong> only. If you
        already have access, open the operator dashboard. New community setup requires administrator approval.
      </p>

      {mappedTenants.length > 0 && (
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Go to operator dashboard →
          </Link>
        </div>
      )}

      {mappedTenants.length > 0 && (
        <section className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-sm font-semibold text-emerald-950">Already connected in JanaGana</h2>
          <div className="mt-3 space-y-3">
            {mappedTenants.map((tenant) => (
              <div key={tenant.id} className="rounded-md border border-emerald-200 bg-white p-3 text-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{tenant.name}</p>
                    <p className="mt-1 text-gray-600">Portal: <span className="font-mono break-all">{publicPortalUrl(tenant.slug)}</span></p>
                    <p className="mt-1 text-gray-600">Tenant slug: <span className="font-mono">{tenant.slug}</span></p>
                  </div>
                  <Link href={`/onboarding/complete?tenantId=${encodeURIComponent(tenant.id)}`} className="text-blue-700 underline">
                    View setup receipt
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {safeError && (
        <p className="mt-4 text-sm text-red-700">{safeError}</p>
      )}

      {params.error === "db-create-recovery-required" && params.clerkOrgId && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Recovery required:</p>
          <p>
            We could not fully roll back a partially-created Clerk organization.
            {existingOrgSetupEnabled ? (
              <>Use <span className="font-medium">Existing organization setup</span> below to map it into JanaGana.</>
            ) : (
              <>Existing organization setup is currently disabled for security review. Contact your administrator or ops team to recover this Clerk org.</>
            )}
          </p>
          {params.requestId && <p className="mt-1">Reference: {params.requestId}</p>}
        </div>
      )}

      {!existingOrgSetupEnabled && (
        <section className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Existing organization mapping is locked for the pilot</h2>
          <p className="mt-1 text-sm text-amber-900">
            JanaGana will not automatically map an existing Clerk organization or make a user an owner/admin. This
            prevents the earlier unsafe case where a new user could see or claim an organization incorrectly.
          </p>
          {unmappedClerkOrgs.length > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-amber-900">Clerk organizations in your account that are not mapped here:</p>
              {unmappedClerkOrgs.map((org) => (
                <div key={org.clerkOrgId} className="rounded-md border border-amber-200 bg-white p-3 text-sm text-amber-950">
                  <p className="font-medium">{org.name}</p>
                  <p className="mt-1">
                    Role: {clerkOrgRoleLabel(org.role)} · Clerk org ID: <span className="font-mono">{shortId(org.clerkOrgId)}</span>
                    {org.slug ? <> · Clerk slug: <span className="font-mono">{org.slug}</span></> : null}
                  </p>
                  <p className="mt-1 text-amber-900">Mapping status: not connected to a JanaGana tenant.</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-amber-900">No unmapped Clerk organizations were found for this account.</p>
          )}
        </section>
      )}

      {existingOrgSetupEnabled && eligibleClerkOrgs.length > 0 && (
        <section className="mt-6 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Existing organization setup</h2>
          <p className="mt-1 text-sm text-gray-600">
            You already belong to these organizations in Clerk. Set one up in JanaGana.
          </p>
          <div className="mt-4 space-y-3">
            {eligibleClerkOrgs.map((org) => (
              <form key={org.clerkOrgId} action={setupExistingClerkOrgAsTenantAction} className="rounded-md border border-gray-200 p-3">
                <input type="hidden" name="clerkOrgId" value={org.clerkOrgId} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-500">
                      {clerkOrgRoleLabel(org.role)} · {shortId(org.clerkOrgId)}
                      {org.slug ? ` · Clerk slug: ${org.slug}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      JanaGana public URL uses a clean slug from the organization name (for example{" "}
                      <span className="font-mono">namaste-boston</span>), not Clerk&apos;s auto-generated slug.
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

      {existingOrgSetupEnabled && blockedClerkOrgs.length > 0 && (
        <section className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Existing Clerk organizations not eligible for setup</h2>
          <p className="mt-1 text-sm text-amber-900">
            You belong to these organizations in Clerk, but only an owner or admin can map them into JanaGana.
          </p>
          <div className="mt-4 space-y-3">
            {blockedClerkOrgs.map((org) => (
              <div key={org.clerkOrgId} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">{org.name}</p>
                <p className="text-xs text-amber-900">
                  {clerkOrgRoleLabel(org.role)} · {shortId(org.clerkOrgId)}{org.slug ? ` · Clerk slug: ${org.slug}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {selfServeEnabled ? (
      <section className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Create a new organization</h2>
        <p className="mt-1 text-sm text-gray-600">
          Use this only when you are intentionally creating a new Clerk organization and a new JanaGana tenant mapping.
          If the organization already appears above, do not create a duplicate.
        </p>

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
          <span>I confirm I am intentionally creating a new organization in Clerk and JanaGana.</span>
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
      ) : (
        <section className="mt-6 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">New community setup is disabled</h2>
          <p className="mt-2 text-sm text-gray-600">
            The pilot does not allow self-serve creation of new Clerk organizations. If you need access to Namaste Boston
            or The Purple Wings, ask your administrator to add you in Clerk and map your org in JanaGana.
          </p>
          <form action="/api/sign-out" method="POST" className="mt-4">
            <button type="submit" className="text-sm text-gray-700 underline">Sign out</button>
          </form>
        </section>
      )}
    </main>
  );
}
