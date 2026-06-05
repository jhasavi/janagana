import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
import { clerkOrgRoleLabel } from "@/lib/auth/clerk-roles";
import { getTenantDashboardSummary } from "@/lib/dashboard/tenant-summary";
import { configuredAppUrl, currentClerkMode, keyModeFromPrefix, publicPortalUrl } from "@/lib/environment";
import { communityLabel, portalLinksForTenant } from "@/lib/pilot/portal-links";
import { selfServeOnboardingEnabled } from "@/lib/pilot/dashboard-nav";
import { tenantMappingStatusLabel, tenantStatusLabel } from "@/lib/tenant/mapping-labels";
import { findMappedTenantsForUser, resolveTenantForDashboard } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

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
  const summary = activeTenant ? await getTenantDashboardSummary(activeTenant.id) : null;
  const tenantLinks = activeTenant ? portalLinksForTenant(activeTenant.slug) : [];

  const engineeringFlags = {
    existingOrgSetup: process.env.ENABLE_EXISTING_ORG_SETUP === "true",
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL?.trim()),
    clerkWebhookSecretConfigured: Boolean(process.env.CLERK_WEBHOOK_SECRET?.trim()),
  };
  const clerkSecretMode = keyModeFromPrefix(process.env.CLERK_SECRET_KEY);
  const appEnvironment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
  const dbHealth = await (async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <section className="space-y-4">
      {activeTenant && <TenantScopeBanner slug={activeTenant.slug} name={activeTenant.name} />}

      <h1 className="text-2xl font-semibold">Portal & setup</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Operator setup for{" "}
        {activeTenant ? communityLabel(activeTenant.slug) : "your community"}: public portal URL, website links, and
        whether your Clerk login maps to this tenant. Access is enforced by{" "}
        <strong>Clerk org membership</strong>, not a separate admin table.
      </p>

      {activeTenant && portalUrl && (
        <div className="mt-6 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Tenant & mapping</h2>
          <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm text-gray-700">
            <Row label="Community">{communityLabel(activeTenant.slug)}</Row>
            <Row label="Tenant name">{activeTenant.name}</Row>
            <Row label="Tenant slug (portal path)">
              <span className="font-mono">{activeTenant.slug}</span>
            </Row>
            <Row label="Public portal URL">
              <a href={portalUrl} target="_blank" rel="noreferrer" className="break-all text-blue-700 underline">
                {portalUrl}
              </a>
            </Row>
            <Row label="Clerk org ID">
              <span className="break-all font-mono text-xs">{activeTenant.clerkOrgId}</span>
            </Row>
            <Row label="Your Clerk role">{clerkOrgRoleLabel(activeClerkOrg?.role)}</Row>
            <Row label="Tenant status">{tenantStatusLabel(activeTenant.status)}</Row>
            <Row label="Mapping status">
              {tenantMappingStatusLabel({
                tenantStatus: activeTenant.status,
                hasClerkMembership: Boolean(activeClerkOrg),
              })}
            </Row>
            <Row label="Contacts in dashboard">{summary?.contactsTotal ?? 0}</Row>
            <Row label="Published events">{summary?.eventsTotal ?? 0} total in DB</Row>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyTextButton text={portalUrl} label="Copy portal URL" />
            <Link href="/dashboard" className="text-sm text-blue-700 underline">
              Back to overview
            </Link>
            <Link href="/select-organization" className="text-sm text-blue-700 underline">
              Switch community
            </Link>
          </div>
        </div>
      )}

      {tenantLinks.length > 0 && (
        <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-950">Website links to copy</h2>
          <p className="mt-1 text-xs text-blue-900">Point NB/TPW CTAs here. Visitors do not sign in with Clerk.</p>
          <ul className="mt-3 space-y-3 text-sm text-blue-950">
            {tenantLinks.map((link) => (
              <li key={link.href}>
                <p className="font-medium">{link.label}</p>
                {link.hint && <p className="text-xs text-blue-800">{link.hint}</p>}
                <a href={link.href} target="_blank" rel="noreferrer" className="mt-1 block break-all font-mono text-blue-700 underline">
                  {link.href}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div id="pilot-scope" className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h2 className="text-sm font-semibold text-gray-900">Pilot scope</h2>
        <p className="mt-2 text-sm text-gray-600">
          This release is <strong>contacts, portal leads, events, and registrations</strong> for Namaste Boston and The
          Purple Wings. Not included: paid membership tiers, Stripe billing, donations, CRM import, email automation, or
          formal member enrollment.
        </p>
      </div>

      <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
        <h2 className="font-semibold">How access works</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Clerk sign-in proves who you are.</li>
          <li>Clerk org membership determines which tenants you can open.</li>
          <li>The dashboard cookie only remembers which tenant you last selected.</li>
          <li>Public visitors use <span className="font-mono">/portal/{"{slug}"}</span> only.</li>
        </ul>
      </div>

      {!selfServeOnboardingEnabled() && (
        <p className="mt-4 text-sm text-gray-600">
          New communities cannot be self-served in this pilot. Contact your administrator for access changes.
        </p>
      )}

      <details className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Advanced diagnostics (engineering)
        </summary>
        <p className="mt-2 text-xs text-gray-500">
          For operators troubleshooting mapping. Slug repair, QA cleanup, and reconciliation run outside this UI.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-y-2 text-sm text-gray-700">
          <Row label="Signed-in user">{user.email ?? user.name ?? user.id}</Row>
          <Row label="Tenant resolution">{resolution.status}</Row>
          {resolution.status === "ONE_TENANT" && (
            <Row label="Resolution source">
              {resolution.source === "active-cookie" ? "Saved tenant preference" : "Single mapped tenant"}
            </Row>
          )}
          <Row label="Mapped tenants">{mappedTenants.length}</Row>
          <Row label="Clerk orgs on account">{clerkOrgs.length}</Row>
          <Row label="Stale tenant cookie cleared">{resolution.staleCookieIgnored ? "yes" : "no"}</Row>
          <Row label="App URL">
            <span className="font-mono text-xs">{configuredAppUrl()}</span>
          </Row>
          <Row label="Runtime">{appEnvironment}</Row>
          <Row label="Database">{dbHealth ? "reachable" : "unreachable"}</Row>
          <Row label="Clerk keys">{currentClerkMode()} publishable · {clerkSecretMode} secret</Row>
          <Row label="Clerk webhook secret">
            {engineeringFlags.clerkWebhookSecretConfigured ? "configured" : "missing"}
          </Row>
          <Row label="Existing-org mapping flag">
            {engineeringFlags.existingOrgSetup ? "enabled (non-pilot)" : "disabled"}
          </Row>
        </dl>
        {unmappedOrgs.length > 0 && (
          <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-medium">Clerk orgs not linked to a tenant</p>
            <ul className="mt-2 list-disc pl-5">
              {unmappedOrgs.map((org) => (
                <li key={org.clerkOrgId}>
                  {org.name} ({clerkOrgRoleLabel(org.role)})
                </li>
              ))}
            </ul>
          </div>
        )}
        {activeTenant && (
          <Link
            href={`/onboarding/complete?tenantId=${encodeURIComponent(activeTenant.id)}`}
            className="mt-4 inline-block text-xs text-blue-700 underline"
          >
            Onboarding receipt
          </Link>
        )}
      </details>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="sm:text-right">{children}</dd>
    </div>
  );
}
