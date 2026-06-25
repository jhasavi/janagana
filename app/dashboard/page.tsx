import Link from "next/link";
import { NextStepsPanel } from "@/components/dashboard/next-steps-panel";
import { OperatorWarningsPanel } from "@/components/dashboard/operator-warnings-panel";
import { TenantIdentityCard } from "@/components/dashboard/tenant-identity-card";
import { getUserClerkOrganizations } from "@/lib/auth";
import { getTenantFinancialSummary } from "@/lib/dashboard/financial-summary";
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
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;

  if (!tenant) {
    console.info("DASHBOARD_TENANT_FAILED", { reason: "DASHBOARD_PAGE_NO_TENANT" });
    return null;
  }

  const [dashboard, clerkOrgs, financial] = await Promise.all([
    getOperatorDashboard(tenant.id, tenant.slug),
    getUserClerkOrganizations(),
    getTenantFinancialSummary(tenant.id),
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
        : "border-stone-200 bg-white text-slate-800";

  console.info("DASHBOARD_COUNTS", { tenantId: tenant.id, ...dashboard.summary, signal: activity.signal });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">Community OS</p>
        <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
        <p className="text-sm text-slate-600">What does your organization need attention on today?</p>
      </header>

      <TenantIdentityCard
        tenant={tenant}
        portalUrl={portalUrl}
        mappingStatus={mappingStatus}
        hasClerkMembership={Boolean(activeClerkOrg)}
      />

      <OperatorWarningsPanel warnings={warnings} />

      <section className={`rounded-lg border p-4 shadow-sm ${signalClass}`}>
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

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">At a glance</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Your community today</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Total contacts"
            value={dashboard.summary.contactsTotal}
            detail={`${activity.contactsLast7Days} new in ${activity.windowDays}d`}
            href="/dashboard/members"
            highlight={dashboard.summary.contactsTotal > 0}
          />
          <MetricCard
            label="Active members"
            value={dashboard.summary.activeMemberships}
            detail={`${dashboard.summary.membershipTiers} membership plan${dashboard.summary.membershipTiers === 1 ? "" : "s"}`}
            href="/dashboard/tiers"
            highlight={dashboard.summary.activeMemberships > 0}
          />
          <MetricCard
            label="Expiring this month"
            value={dashboard.membershipRenewals.expiringThisMonth}
            detail={`${dashboard.membershipRenewals.expiringIn30Days} in next 30 days`}
            href="/dashboard/memberships/renewals?filter=expiring_30"
            highlight={dashboard.membershipRenewals.expiringThisMonth > 0}
          />
          <MetricCard
            label="Expired members"
            value={dashboard.membershipRenewals.expiredMembers}
            detail={
              dashboard.membershipRenewals.needsReminderCount > 0
                ? `${dashboard.membershipRenewals.needsReminderCount} may need reminder`
                : "Open renewals desk"
            }
            href="/dashboard/memberships/renewals?filter=expired"
            highlight={dashboard.membershipRenewals.expiredMembers > 0}
          />
          <MetricCard
            label="Upcoming events"
            value={dashboard.upcomingEventsCount}
            detail={`${dashboard.publishedEvents} published · ${dashboard.draftEvents} draft`}
            href="/dashboard/events"
            highlight={dashboard.upcomingEventsCount > 0}
          />
          <MetricCard
            label="Recent payments"
            value={financial.membershipPaymentCount + financial.eventPaymentCount + financial.donationPaymentCount}
            detail={formatCents(financial.totalRevenueCents) + " total received"}
            href="/dashboard/payments"
            highlight={financial.totalRevenueCents > 0}
          />
          <MetricCard
            label="Volunteer contacts"
            value={dashboard.summary.contactsVolunteerType}
            detail="Shift sign-up coming soon"
            href="/dashboard/volunteers"
            highlight={dashboard.summary.contactsVolunteerType > 0}
          />
          <MetricCard
            label="Donations received"
            value={financial.donationPaymentCount}
            detail={formatCents(financial.donationRevenueCents)}
            href="/dashboard/donations"
            highlight={financial.donationPaymentCount > 0}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">Money</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Revenue snapshot</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total revenue"
          value={formatCents(financial.totalRevenueCents)}
          detail={`${financial.pendingOrFailedCount} pending/failed`}
          href="/dashboard/tiers"
          highlight={financial.totalRevenueCents > 0}
        />
        <MetricCard
          label="Membership revenue"
          value={formatCents(financial.membershipRevenueCents)}
          detail={`${financial.membershipPaymentCount} payments`}
          href="/dashboard/tiers"
          highlight={financial.membershipRevenueCents > 0}
        />
        <MetricCard
          label="Event revenue"
          value={formatCents(financial.eventRevenueCents)}
          detail={`${financial.eventPaymentCount} payments`}
          href="/dashboard/events"
          highlight={financial.eventRevenueCents > 0}
        />
        <MetricCard
          label="Donations"
          value={formatCents(financial.donationRevenueCents)}
          detail={`${financial.donationPaymentCount} payments`}
          href="/dashboard/donations"
          highlight={financial.donationRevenueCents > 0}
        />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">Activity</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">People and events</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          label="Active memberships"
          value={dashboard.summary.activeMemberships}
          detail={`${dashboard.summary.formalMemberships} total enrollments`}
          href="/dashboard/tiers"
          highlight={dashboard.summary.activeMemberships > 0}
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
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Recent contacts & leads</h2>
              <p className="mt-0.5 text-sm text-slate-600">Source, intent, and arrival time for this community.</p>
            </div>
            <Link href="/dashboard/members" className="shrink-0 text-sm font-semibold text-teal-900 hover:text-slate-950">
              All contacts
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
                  <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Person</th>
                    <th className="py-2 pr-4">Intent</th>
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentContacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-stone-100">
                      <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                        <span title={formatDate(contact.createdAt)}>{formatRelativeTime(contact.createdAt)}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-950">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-slate-600">{contact.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                          {pilotContactKindLabel(contact)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{contactSourceLabel(contact.source)}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {contact.lastActivitySummary ?? "—"}
                        {contact._count.registrations > 0 && (
                          <p className="mt-0.5 text-xs text-slate-500">
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

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">Website CTAs for this community</h2>
            <p className="mt-1 text-xs text-slate-600">Copy these links into the public website.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {portalLinksForTenant(tenant.slug).slice(0, 4).map((link) => (
                <li key={link.href}>
                  <p className="font-medium text-slate-800">{link.label}</p>
                  <a href={link.href} target="_blank" rel="noreferrer" className="break-all text-xs text-teal-900 hover:text-slate-950">
                    {link.href}
                  </a>
                </li>
              ))}
            </ul>
            <Link href="/dashboard/settings" className="mt-3 inline-block text-xs font-semibold text-teal-900 hover:text-slate-950">
              All portal links in setup
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Recent event registrations</h2>
            <p className="mt-0.5 text-sm text-slate-600">Visitors who completed a published event registration flow.</p>
          </div>
          <Link href="/dashboard/events" className="shrink-0 text-sm font-semibold text-teal-900 hover:text-slate-950">
            Events
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
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Registrant</th>
                  <th className="py-2 pr-4">Event</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Source / intent</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentRegistrations.map((registration) => (
                  <tr key={registration.id} className="border-b border-stone-100">
                    <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                      <span title={formatDate(registration.createdAt)}>{formatRelativeTime(registration.createdAt)}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-950">
                        {registration.contact.firstName} {registration.contact.lastName}
                      </p>
                      <p className="text-slate-600">{registration.contact.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-950">{registration.event.title}</p>
                      <p className="font-mono text-xs text-slate-500">/register/{registration.event.slug}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
                        {registration.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {contactSourceLabel(registration.contact.source)}
                      {registration.contact.interestType && (
                        <span className="text-slate-500">
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

      {financial.recentPayments.length > 0 && (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Recent payments</h2>
              <p className="mt-0.5 text-sm text-slate-600">Membership, event, and donation transactions.</p>
            </div>
            <Link href="/dashboard/payments" className="shrink-0 text-sm font-semibold text-teal-900 hover:text-slate-950">
              All payments
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Person</th>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2 pr-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {financial.recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-stone-100">
                    <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                      <span title={formatDate(payment.paidAt ?? payment.createdAt)}>
                        {formatRelativeTime(payment.paidAt ?? payment.createdAt)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {payment.contact ? (
                        <>
                          <p className="font-medium text-slate-950">
                            {payment.contact.firstName} {payment.contact.lastName}
                          </p>
                          <p className="text-slate-600">{payment.contact.email}</p>
                        </>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{payment.purpose}</td>
                    <td className="py-3 pr-4 font-medium text-slate-950">{formatCents(payment.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {dashboard.upcomingEvents.length > 0 && (
        <details className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-medium text-slate-800">
            Upcoming published events ({dashboard.upcomingEvents.length})
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            {dashboard.upcomingEvents.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 py-2 last:border-0">
                <span className="font-medium text-slate-950">{event.title}</span>
                <span className="text-slate-600">
                  {formatDate(event.startsAt)} · {event._count.registrations} registrations
                </span>
                <Link href={`/dashboard/events/${event.id}/registrations`} className="font-semibold text-teal-900 hover:text-slate-950">
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
  value: number | string;
  detail: string;
  href: string;
  highlight: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border p-5 shadow-sm transition-colors hover:border-teal-300 hover:bg-white ${
        highlight ? "border-stone-200 bg-white" : "border-dashed border-stone-300 bg-stone-50"
      }`}
    >
      <div className={`text-3xl font-semibold ${highlight ? "text-slate-950" : "text-slate-400"}`}>{value}</div>
      <div className="mt-2 text-sm font-semibold text-slate-800">{label}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>
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
      <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-700">
        <p className="font-medium text-slate-950">No contacts for {tenantSlug} yet</p>
        <p className="mt-2">
          Test that website traffic is reaching JanaGana: open your portal contact form in an incognito window, submit a
          unique email, then refresh this page.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            Portal contact:{" "}
            <a href={contactPath} className="break-all font-medium text-teal-900 hover:text-slate-950">
              {contactPath}
            </a>
          </li>
          <li>Wrong site (e.g. TPW newsletter only) will not appear here.</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-700">
      <p className="font-medium text-slate-950">No event registrations yet</p>
      <p className="mt-2">
        Publish an event, then register in incognito via{" "}
        <a href={eventsPath} className="font-medium text-teal-900 hover:text-slate-950">
          {eventsPath}
        </a>
        .
      </p>
    </div>
  );
}
