import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
import { configuredAppUrl, currentClerkMode, publicPortalUrl } from "@/lib/environment";
import { findMappedTenantsForUser, resolveTenantForDashboard } from "@/lib/tenant";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const [resolution, clerkOrgs, mappedTenants] = await Promise.all([
    resolveTenantForDashboard(),
    getUserClerkOrganizations(),
    findMappedTenantsForUser(),
  ]);

  const mappedIds = new Set(mappedTenants.map((t) => t.clerkOrgId));
  const unmappedOrgs = clerkOrgs.filter((org) => !mappedIds.has(org.clerkOrgId));
  const activeTenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const activeClerkOrg = activeTenant
    ? clerkOrgs.find((org) => org.clerkOrgId === activeTenant.clerkOrgId) ?? null
    : null;
  const portalUrl = activeTenant ? publicPortalUrl(activeTenant.slug) : null;

  return (
    <section>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-gray-600">Operational health and tenant mapping diagnostics.</p>

      <div className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Tenant Health</h2>
        <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <dt>User</dt>
            <dd>{user.email ?? user.name ?? user.id}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Resolution status</dt>
            <dd>{resolution.status}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Mapped tenants</dt>
            <dd>{mappedTenants.length}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Clerk organizations</dt>
            <dd>{clerkOrgs.length}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Unmapped Clerk organizations</dt>
            <dd>{unmappedOrgs.length}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Stale cookie ignored</dt>
            <dd>{resolution.staleCookieIgnored ? "yes" : "no"}</dd>
          </div>
        </dl>
      </div>

      {activeTenant && portalUrl && (
        <div className="mt-4 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Active Tenant</h2>
          <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between gap-4">
              <dt>Name</dt>
              <dd className="text-right">{activeTenant.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Public slug</dt>
              <dd className="font-mono text-right">{activeTenant.slug}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Portal URL</dt>
              <dd className="text-right">
                <a href={portalUrl} target="_blank" rel="noreferrer" className="break-all text-blue-700 underline">
                  {portalUrl}
                </a>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Clerk org ID</dt>
              <dd className="font-mono text-right">{activeTenant.clerkOrgId}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Clerk org slug</dt>
              <dd className="font-mono text-right">{activeClerkOrg?.slug ?? "(none)"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/onboarding/complete?tenantId=${encodeURIComponent(activeTenant.id)}`} className="text-sm text-blue-700 underline">
              View onboarding receipt
            </Link>
            <Link href="/select-organization" className="text-sm text-blue-700 underline">
              Switch organization
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-4">
        <h2 className="text-sm font-semibold text-blue-950">Website Integration</h2>
        <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm text-blue-950">
          <div className="flex items-center justify-between gap-4">
            <dt>App URL</dt>
            <dd className="font-mono text-right">{configuredAppUrl()}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Clerk mode</dt>
            <dd>{currentClerkMode()}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Partner-site env</dt>
            <dd className="font-mono text-right">NEXT_PUBLIC_JANAGANA_PORTAL_BASE_URL</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>API keys</dt>
            <dd>Deferred in v3</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-blue-950">
          NB and TPW should link visitors to the public portal. Direct CRM sync and JanaGana API keys are not enabled yet.
        </p>
      </div>

      <div className="mt-4 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Clerk Deletion Sync</h2>
        <p className="mt-2 text-sm text-gray-600">
          Clerk deletion webhooks suspend matching JanaGana tenants. If Clerk and JanaGana ever drift, run the ops-only reconciliation endpoint:
        </p>
        <p className="mt-2 break-all font-mono text-sm text-gray-900">
          /api/ops/clerk-tenant-reconciliation
        </p>
      </div>

      {unmappedOrgs.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Unmapped Clerk organizations found</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
            {unmappedOrgs.map((org) => (
              <li key={org.clerkOrgId}>{org.name}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
