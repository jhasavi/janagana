import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
import { currentClerkMode, publicPortalUrl } from "@/lib/environment";
import { prisma } from "@/lib/prisma";
import { findMappedTenantsForUser } from "@/lib/tenant";

function shortId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function sourceLabel(source: string | undefined): string {
  if (source === "existing") return "Existing Clerk organization mapped";
  if (source === "create") return "New owner organization created";
  return "Organization ready";
}

export default async function OnboardingCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; source?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const [mappedTenants, clerkOrgs] = await Promise.all([
    findMappedTenantsForUser(),
    getUserClerkOrganizations(),
  ]);

  if (mappedTenants.length === 0) {
    redirect("/onboarding/create-organization");
  }

  const requestedTenant =
    params.tenantId
      ? mappedTenants.find((tenant) => tenant.id === params.tenantId)
      : mappedTenants.length === 1
        ? mappedTenants[0]
        : null;

  if (!requestedTenant) {
    redirect("/select-organization?error=invalid-tenant");
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: requestedTenant.id,
      clerkOrgId: requestedTenant.clerkOrgId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      clerkOrgId: true,
      status: true,
      createdAt: true,
    },
  });

  if (!tenant) {
    redirect("/select-organization?error=invalid-tenant");
  }

  const clerkOrg = clerkOrgs.find((org) => org.clerkOrgId === tenant.clerkOrgId) ?? null;
  const portalUrl = publicPortalUrl(tenant.slug);
  const clerkMode = currentClerkMode();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm font-medium text-emerald-700">{sourceLabel(params.source)}</p>
      <h1 className="mt-1 text-2xl font-semibold text-gray-900">{tenant.name}</h1>
      <p className="mt-2 text-sm text-gray-600">
        These are the JanaGana and Clerk values for this organization.
      </p>

      <section className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Public portal</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-[11rem_1fr]">
          <dt className="font-medium text-gray-600">Portal URL</dt>
          <dd>
            <a href={portalUrl} target="_blank" rel="noreferrer" className="break-all text-blue-700 underline">
              {portalUrl}
            </a>
          </dd>
          <dt className="font-medium text-gray-600">Tenant slug</dt>
          <dd className="font-mono text-gray-900">{tenant.slug}</dd>
          <dt className="font-medium text-gray-600">Tenant ID</dt>
          <dd className="font-mono text-gray-900">{tenant.id}</dd>
          <dt className="font-medium text-gray-600">Status</dt>
          <dd>{tenant.status}</dd>
        </dl>
      </section>

      <section className="mt-4 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Clerk mapping</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-[11rem_1fr]">
          <dt className="font-medium text-gray-600">Environment</dt>
          <dd>{clerkMode}</dd>
          <dt className="font-medium text-gray-600">Clerk org ID</dt>
          <dd className="font-mono text-gray-900">{tenant.clerkOrgId}</dd>
          <dt className="font-medium text-gray-600">Clerk slug</dt>
          <dd className="font-mono text-gray-900">{clerkOrg?.slug ?? "(none)"}</dd>
          <dt className="font-medium text-gray-600">Clerk role</dt>
          <dd>{clerkOrg?.role ?? "member"}</dd>
          <dt className="font-medium text-gray-600">Short ID</dt>
          <dd className="font-mono text-gray-900">{shortId(tenant.clerkOrgId)}</dd>
        </dl>
      </section>

      <section className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
        <h2 className="font-semibold">Website integration</h2>
        <p className="mt-2">
          NB and TPW should use portal links today. Configure partner sites with{" "}
          <span className="font-mono">NEXT_PUBLIC_JANAGANA_PORTAL_BASE_URL</span> and link to the portal URL above.
        </p>
        <p className="mt-2">
          JanaGana API keys and direct CRM sync are not available in v3; those are deferred until the API-key feature is built.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
          Open dashboard
        </Link>
        <Link href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50">
          View diagnostics
        </Link>
        <a href={portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50">
          Public portal <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </main>
  );
}
