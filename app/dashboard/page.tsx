import Link from "next/link";
import { NextStepsPanel } from "@/components/dashboard/next-steps-panel";
import { OperatorWarningsPanel } from "@/components/dashboard/operator-warnings-panel";
import { TenantIdentityCard } from "@/components/dashboard/tenant-identity-card";
import { getUserClerkOrganizations } from "@/lib/auth";
import { getOperatorDashboard } from "@/lib/dashboard/operator-dashboard";
import { buildMappingWarnings, mergeOperatorWarnings } from "@/lib/dashboard/operator-warnings";
import { publicPortalUrl } from "@/lib/environment";
import {
  contactInterestLabel,
  contactSourceLabel,
  pilotContactKindLabel,
} from "@/lib/pilot/contact-labels";
import { portalLinksForTenant } from "@/lib/pilot/portal-links";
import { tenantMappingStatusLabel } from "@/lib/tenant/mapping-labels";
import { resolveTenantForDashboard } from "@/lib/tenant";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  if (!tenant) {
    console.info("DASHBOARD_TENANT_FAILED", { reason: "DASHBOARD_PAGE_NO_TENANT" });
    return null;
  }

  const [dashboard, clerkOrgs] = await Promise.all([
    getOperatorDashboard(tenant.id, tenant.slug),
    getUserClerkOrganizations(),
  ]);

  const portalUrl = publicPortalUrl(tenant.slug);
  const activeClerkOrg = clerkOrgs.find((org) => org.clerkOrgId === tenant.clerkOrgId) ?? null;
  const mappingStatus = tenantMappingStatusLabel({
    tenantStatus: tenant.status,
    hasClerkMembership: Boolean(activeClerkOrg),
  });
  const warnings = mergeOperatorWarnings(
    buildMappingWarnings({
      tenantStatus: tenant.status,
      hasClerkMembership: Boolean(activeClerkOrg),
      resolution,
    }),
    dashboard.operationalWarnings,
  );

  const { activity } = dashboard;
  const signalLabel =
    activity.signal === "healthy"
      ? "Leads and registrations are flowing"
      : activity.signal === "watch"
        ? "Data on file — nothing new this week"
        : "Setup — verify portal and website paths";

  const signalClass =
    activity.signal === "healthy"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : activity.signal === "watch"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-gray-200 bg-gray-100 text-gray-800";

  console.info("DASHBOARD_COUNTS", { tenantId: tenant.id, ...dashboard.summary, signal: activity.signal });

  return (
    <div className="space-y-6">
      <TenantIdentityCard
        tenant={tenant}
        portalUrl={portalUrl}
        mappingStatus={mappingStatus}
        hasClerkMembership={Boolean(activeClerkOrg)}
      />

      <OperatorWarningsPanel warnings={warnings} />

      <section className={`rounded-md border p-4 ${signalClass}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{signalLabel}</p>
            <p className="mt-1 text-sm opacity-90">
              Last {activity.windowDays} days:{" "}
              <strong>{activity.contactsLast7Days}</strong> new contact
              {activity.contactsLast7Days === 1 ? "" : "s"}
              {" · "}
              <strong>{activity.registrationsLast7Days}</strong> new registration
              {activity.registrationsLast7Days === 1 ? "" : "s"}
            </p>
          </div>
          <dl className="grid gap-1 text-sm sm:text-right">
            <div>
              <dt className="inline font-medium opacity-80">Last contact: </dt>
              <dd className="inline">
                {activity.lastContactAt ? formatRelativeTime(activity.lastContactAt) : "None yet"}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium opacity-80">Last registration: </dt>
              <dd className="inline">
                {activity.lastRegistrationAt ? formatRelativeTime(activity.lastRegistrationAt) : "None yet"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Contacts in this tenant"
          value={dashboard.summary.contactsTotal}
          detail={`${activity.contactsLast7Days} new in ${activity.windowDays}d`}
          href="/dashboard/members"
          highlight={dashboard.summary.contactsTotal > 0}
        />
        <MetricCard
          label="Portal leads / inquiries"
          value={dashboard.summary.contactsLeads}
          detail="Newsletter, contact form, interest CTAs"
          href="/dashboard/members"
          highlight={dashboard.summary.contactsLeads > 0}
        />
        <MetricCard
          label="Confirmed registrations"
          value={dashboard.summary.eventRegistrationsConfirmed}
          detail={`${activity.registrationsLast7Days} new in ${activity.windowDays}d · ${dashboard.summary.eventRegistrationsTotal} total`}
          href="/dashboard/events"
          highlight={dashboard.summary.eventRegistrationsConfirmed > 0}
        />
        <MetricCard
          label="Published events live"
          value={dashboard.publishedEvents}
          detail={`${dashboard.draftEvents} draft`}
          href="/dashboard/events"
          highlight={dashboard.publishedEvents > 0}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Recent contacts & leads</h2>
              <p className="mt-0.5 text-sm text-gray-600">Source, intent, and when they arrived — scoped to this tenant only.</p>
            </div>
            <Link href="/dashboard/members" className="shrink-0 text-sm font-medium text-blue-700 underline">
              All contacts →
            </Link>
          </div>
          {dashboard.recentContacts.length === 0 ? (
            <EmptyPilotState
              tenantSlug={tenant.slug}
              portalUrl={portalUrl}
              kind="contacts"
            />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Person</th>
                    <th className="py-2 pr-4">Intent</th>
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentContacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                        <span title={formatDate(contact.createdAt)}>{formatRelativeTime(contact.createdAt)}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-gray-600">{contact.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                          {pilotContactKindLabel(contact)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{contactSourceLabel(contact.source)}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {contact.lastActivitySummary ?? "—"}
                        {contact._count.registrations > 0 && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {contact._count.registrations} event registration
                            {contact._count.registrations === 1 ? "" : "s"}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <NextStepsPanel
            tenantSlug={tenant.slug}
            portalUrl={portalUrl}
            hasContacts={dashboard.summary.contactsTotal > 0}
            hasPublishedEvents={dashboard.publishedEvents > 0}
            hasRegistrations={dashboard.summary.eventRegistrationsConfirmed > 0}
          />

          <div className="rounded-md border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Website CTAs for this tenant</h2>
            <p className="mt-1 text-xs text-gray-600">Copy onto namastebostonhomes.com or thepurplewings.org.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {portalLinksForTenant(tenant.slug).slice(0, 4).map((link) => (
                <li key={link.href}>
                  <p className="font-medium text-gray-800">{link.label}</p>
                  <a href={link.href} target="_blank" rel="noreferrer" className="break-all text-xs text-blue-700 underline">
                    {link.href}
                  </a>
                </li>
              ))}
            </ul>
            <Link href="/dashboard/settings" className="mt-3 inline-block text-xs text-blue-700 underline">
              All portal links in setup →
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Recent event registrations</h2>
            <p className="mt-0.5 text-sm text-gray-600">Confirms visitors completed a published event register flow.</p>
          </div>
          <Link href="/dashboard/events" className="shrink-0 text-sm font-medium text-blue-700 underline">
            Events →
          </Link>
        </div>
        {dashboard.recentRegistrations.length === 0 ? (
          <div className="mt-4">
            <EmptyPilotState tenantSlug={tenant.slug} portalUrl={portalUrl} kind="registrations" />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Registrant</th>
                  <th className="py-2 pr-4">Event</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Source / intent</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentRegistrations.map((registration) => (
                  <tr key={registration.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                      <span title={formatDate(registration.createdAt)}>{formatRelativeTime(registration.createdAt)}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">
                        {registration.contact.firstName} {registration.contact.lastName}
                      </p>
                      <p className="text-gray-600">{registration.contact.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{registration.event.title}</p>
                      <p className="text-xs text-gray-500 font-mono">/register/{registration.event.slug}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
                        {registration.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {contactSourceLabel(registration.contact.source)}
                      {registration.contact.interestType && (
                        <span className="text-gray-500">
                          {" "}
                          · {contactInterestLabel(registration.contact.interestType)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dashboard.upcomingEvents.length > 0 && (
        <details className="rounded-md border border-gray-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-800">
            Upcoming published events ({dashboard.upcomingEvents.length})
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            {dashboard.upcomingEvents.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 py-2 last:border-0">
                <span className="font-medium text-gray-900">{event.title}</span>
                <span className="text-gray-600">
                  {formatDate(event.startsAt)} · {event._count.registrations} registrations
                </span>
                <Link href={`/dashboard/events/${event.id}/registrations`} className="text-blue-700 underline">
                  View
                </Link>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  href,
  highlight,
}: {
  label: string;
  value: number;
  detail: string;
  href: string;
  highlight: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md border p-5 transition-colors hover:border-blue-300 ${
        highlight ? "border-gray-200 bg-white" : "border-dashed border-gray-300 bg-gray-50"
      }`}
    >
      <div className={`text-3xl font-semibold ${highlight ? "text-gray-900" : "text-gray-400"}`}>{value}</div>
      <div className="mt-1 text-sm font-medium text-gray-800">{label}</div>
      <div className="mt-1 text-xs text-gray-500">{detail}</div>
    </Link>
  );
}

function EmptyPilotState({
  tenantSlug,
  portalUrl,
  kind,
}: {
  tenantSlug: string;
  portalUrl: string;
  kind: "contacts" | "registrations";
}) {
  const contactPath = `${portalUrl}/contact`;
  const eventsPath = `${portalUrl}/events`;

  if (kind === "contacts") {
    return (
      <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-700">
        <p className="font-medium text-gray-900">No contacts for {tenantSlug} yet</p>
        <p className="mt-2">
          Test that website traffic is reaching JanaGana: open your portal contact form in an incognito window, submit a
          unique email, then refresh this page.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            Portal contact:{" "}
            <a href={contactPath} className="text-blue-700 underline break-all">
              {contactPath}
            </a>
          </li>
          <li>Wrong site (e.g. TPW newsletter only) will not appear here.</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-700">
      <p className="font-medium text-gray-900">No event registrations yet</p>
      <p className="mt-2">
        Publish an event, then register in incognito via{" "}
        <a href={eventsPath} className="text-blue-700 underline">
          {eventsPath}
        </a>
        .
      </p>
    </div>
  );
}
