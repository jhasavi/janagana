import { redirect } from "next/navigation";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
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
