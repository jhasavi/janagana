import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
import { clerkOrgRoleLabel } from "@/lib/auth/clerk-roles";
import { communityLabel } from "@/lib/pilot/tenants";
import { PILOT_TENANT_SLUGS } from "@/lib/pilot/tenants";
import { findMappedTenantsForUser } from "@/lib/tenant";
import { isLocalClerkMode } from "@/lib/tenant/onboarding-redirect";

function shortId(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default async function NoAccessPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const [mappedTenants, clerkOrgs] = await Promise.all([
    findMappedTenantsForUser(),
    getUserClerkOrganizations(),
  ]);

  if (mappedTenants.length > 0) {
    redirect(mappedTenants.length > 1 ? "/select-organization" : "/dashboard");
  }

  const mappedIds = new Set(mappedTenants.map((t) => t.clerkOrgId));
  const unmappedOrgs = clerkOrgs.filter((org) => !mappedIds.has(org.clerkOrgId));
  const pilotNames = PILOT_TENANT_SLUGS.map((slug) => communityLabel(slug)).join(" and ");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm font-medium text-amber-800">No operator access yet</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Your account is not connected to a pilot community</h1>
      <p className="mt-3 text-sm text-gray-600">
        Signed in as <strong>{user.email ?? user.name ?? user.id}</strong>. The production pilot only includes{" "}
        <strong>{pilotNames}</strong>. Your Clerk organization must be mapped in JanaGana before the dashboard opens.
      </p>

      {unmappedOrgs.length > 0 && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Clerk organizations on your account (not connected):</p>
          <ul className="mt-3 space-y-2">
            {unmappedOrgs.map((org) => (
              <li key={org.clerkOrgId} className="rounded-md border border-amber-100 bg-white px-3 py-2">
                <p className="font-medium text-gray-900">{org.name}</p>
                <p className="mt-1 text-xs text-gray-600">
                  Role: {clerkOrgRoleLabel(org.role)} · Clerk org ID:{" "}
                  <span className="font-mono">{shortId(org.clerkOrgId)}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLocalClerkMode() && (
        <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <p className="font-medium">Local development note</p>
          <p className="mt-2">
            You are using <strong>Clerk test</strong> keys. Localhost only works when your test Clerk org IDs match the{" "}
            <span className="font-mono">Tenant.clerkOrgId</span> rows in your dev database, or when an admin adds you to
            mapped test orgs.
          </p>
          <p className="mt-2">
            Quick options: run <span className="font-mono">npm run seed:local-clerk</span> after setting org IDs in{" "}
            <span className="font-mono">.env.local</span>, or sign in on production with your pilot operator account.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="https://janagana.namasteneedham.com/sign-in"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          Open production sign-in
        </Link>
        <form action="/api/sign-out" method="POST">
          <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Sign out
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Need access? Ask your administrator to add you to Namaste Boston or The Purple Wings in Clerk, then map the org in
        JanaGana.
      </p>
    </main>
  );
}
