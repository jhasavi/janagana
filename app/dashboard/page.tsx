import Link from "next/link";
import { resolveTenantForDashboard } from "@/lib/tenant";
import { getTenantDashboardSummary } from "@/lib/dashboard/tenant-summary";

export default async function DashboardPage() {
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  if (!tenant) {
    console.info("DASHBOARD_TENANT_FAILED", { reason: "DASHBOARD_PAGE_NO_TENANT" });
  } else {
    console.info("DASHBOARD_TENANT_RESOLVED", { source: "dashboard-page", tenantId: tenant.id });
  }

  const summary = tenant ? await getTenantDashboardSummary(tenant.id) : null;

  if (tenant && summary) {
    console.info("DASHBOARD_COUNTS", { tenantId: tenant.id, ...summary });
  }

  const portalUrl = tenant ? `/portal/${tenant.slug}` : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tenant: {tenant?.name ?? "Not resolved"}</p>
        {portalUrl && (
          <p className="text-sm text-gray-600 mt-2">
            Public portal:{" "}
            <Link href={portalUrl} className="text-blue-700 underline">
              {portalUrl}
            </Link>
          </p>
        )}
      </div>

      {summary && (
        <>
          <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
            <p className="font-medium">How people are counted</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Contacts</strong> — everyone captured from your portal (registrations, newsletter, inquiries) or added manually.
              </li>
              <li>
                <strong>Event registrations</strong> — sign-ups for published events (view per event under Events).
              </li>
              <li>
                <strong>Formal memberships</strong> — paid/tier enrollments (not enabled yet; stays 0 until enrollment is built).
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard label="Contacts" value={String(summary.contactsTotal)} href="/dashboard/members" />
            <StatCard
              label="Event registrations"
              value={String(summary.eventRegistrationsConfirmed)}
              sublabel={
                summary.eventRegistrationsTotal !== summary.eventRegistrationsConfirmed
                  ? `${summary.eventRegistrationsTotal} total incl. canceled`
                  : "confirmed"
              }
              href="/dashboard/events"
            />
            <StatCard label="Events" value={String(summary.eventsTotal)} href="/dashboard/events" />
            <StatCard
              label="Formal memberships"
              value={String(summary.formalMemberships)}
              sublabel="enrollment not enabled yet"
              href="/dashboard/tiers"
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Breakdown</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>Contacts (all): {summary.contactsTotal}</li>
              <li>Leads &amp; inquiries (portal contact form): {summary.contactsLeads}</li>
              <li>Contacts tagged registrant: {summary.contactsRegistrantType}</li>
              <li>Contacts tagged member (manual): {summary.contactsFormalType}</li>
              <li>Confirmed event registrations: {summary.eventRegistrationsConfirmed}</li>
              <li>Membership tiers defined: {summary.membershipTiers}</li>
            </ul>
            {summary.contactsTotal === 0 && summary.eventRegistrationsTotal === 0 && (
              <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                No people captured yet. Publish an event, share your portal link, or submit a test registration / contact form.
                Creating an event alone does not add contacts until someone registers or submits interest.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  href,
}: {
  label: string;
  value: string;
  sublabel?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors"
    >
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {sublabel && <div className="text-xs text-gray-400 mt-1">{sublabel}</div>}
    </Link>
  );
}
