import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  CreditCard,
  type LucideIcon,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { NextStepsPanel } from "@/components/dashboard/next-steps-panel";
import { OperatorWarningsPanel } from "@/components/dashboard/operator-warnings-panel";
import { buildPriorityItems, PriorityQueue } from "@/components/dashboard/priority-queue";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TenantIdentityCard } from "@/components/dashboard/tenant-identity-card";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
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
      ? "border-success/20 bg-success/10 text-success"
      : activity.signal === "watch"
        ? "border-warning/20 bg-warning/10 text-warning"
        : "border-border bg-card text-foreground";

  const priorities = buildPriorityItems({
    expiringThisMonth: dashboard.membershipRenewals.expiringThisMonth,
    expiredMembers: dashboard.membershipRenewals.expiredMembers,
    draftEvents: dashboard.draftEvents,
    contactsTotal: dashboard.summary.contactsTotal,
    publishedEvents: dashboard.publishedEvents,
    hasRegistrations: dashboard.summary.eventRegistrationsConfirmed > 0,
  });

  console.info("DASHBOARD_COUNTS", { tenantId: tenant.id, ...dashboard.summary, signal: activity.signal });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Command center"
        title="Today at a glance"
        description="What needs your attention, and how your community is doing."
      />

      <QuickActions portalUrl={portalUrl} />

      <PriorityQueue items={priorities} />

      <TenantIdentityCard
        tenant={tenant}
        portalUrl={portalUrl}
        mappingStatus={mappingStatus}
        hasClerkMembership={Boolean(activeClerkOrg)}
      />

      <OperatorWarningsPanel warnings={warnings} />

      <section className={`rounded-xl border p-4 shadow-sm ${signalClass}`}>
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

      <section className="space-y-4">
        <SectionHeader eyebrow="Overview" title="Community health" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            icon={Users}
            label="Total contacts"
            value={dashboard.summary.contactsTotal}
            detail={`${activity.contactsLast7Days} new in ${activity.windowDays}d`}
            href="/dashboard/members"
            highlight={dashboard.summary.contactsTotal > 0}
          />
          <MetricCard
            icon={CreditCard}
            label="Active members"
            value={dashboard.summary.activeMemberships}
            detail={`${dashboard.summary.membershipTiers} membership plan${dashboard.summary.membershipTiers === 1 ? "" : "s"}`}
            href="/dashboard/tiers"
            highlight={dashboard.summary.activeMemberships > 0}
          />
          <MetricCard
            icon={CalendarClock}
            label="Expiring this month"
            value={dashboard.membershipRenewals.expiringThisMonth}
            detail={`${dashboard.membershipRenewals.expiringIn30Days} in next 30 days`}
            href="/dashboard/memberships/renewals?filter=expiring_30"
            highlight={dashboard.membershipRenewals.expiringThisMonth > 0}
          />
          <MetricCard
            icon={UserPlus}
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
            icon={CalendarDays}
            label="Upcoming events"
            value={dashboard.upcomingEventsCount}
            detail={`${dashboard.publishedEvents} published · ${dashboard.draftEvents} draft`}
            href="/dashboard/events"
            highlight={dashboard.upcomingEventsCount > 0}
          />
          <MetricCard
            icon={Wallet}
            label="Recent payments"
            value={financial.membershipPaymentCount + financial.eventPaymentCount + financial.donationPaymentCount}
            detail={formatCents(financial.totalRevenueCents) + " total received"}
            href="/dashboard/payments"
            highlight={financial.totalRevenueCents > 0}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Revenue: <strong className="text-foreground">{formatCents(financial.totalRevenueCents)}</strong> total
          {" · "}
          {formatCents(financial.membershipRevenueCents)} memberships
          {" · "}
          {formatCents(financial.eventRevenueCents)} events
          {" · "}
          {formatCents(financial.donationRevenueCents)} donations —{" "}
          <Link href="/dashboard/payments" className="font-semibold text-primary hover:text-foreground">
            View payments
          </Link>
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recent contacts & leads</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Who reached out and why.</p>
            </div>
            <Link href="/dashboard/members" className="shrink-0 text-sm font-semibold text-primary hover:text-foreground">
              All contacts
            </Link>
          </div>
          <CardBody className="pt-4">
            {dashboard.recentContacts.length === 0 ? (
              <EmptyPilotState tenantSlug={tenant.slug} portalUrl={portalUrl} kind="contacts" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4">When</th>
                      <th className="py-2 pr-4">Person</th>
                      <th className="py-2 pr-4">Intent</th>
                      <th className="py-2 pr-4">Source</th>
                      <th className="py-2 pr-4">Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentContacts.map((contact) => (
                      <tr key={contact.id} className="border-b border-border/60">
                        <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                          <span title={formatDate(contact.createdAt)}>{formatRelativeTime(contact.createdAt)}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <Link href={`/dashboard/members/${contact.id}`} className="block">
                            <p className="font-medium text-foreground hover:text-primary">
                              {contact.firstName} {contact.lastName}
                            </p>
                            <p className="text-muted-foreground">{contact.email}</p>
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                            {pilotContactKindLabel(contact)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-foreground/80">{contactSourceLabel(contact.source)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {contact.lastActivitySummary ?? "—"}
                          {contact._count.registrations > 0 && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
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
          </CardBody>
        </Card>

        <div className="space-y-4">
          <NextStepsPanel
            tenantSlug={tenant.slug}
            portalUrl={portalUrl}
            hasContacts={dashboard.summary.contactsTotal > 0}
            hasPublishedEvents={dashboard.publishedEvents > 0}
            hasRegistrations={dashboard.summary.eventRegistrationsConfirmed > 0}
          />

          <Card>
            <CardBody>
              <h2 className="text-sm font-semibold text-foreground">Website links</h2>
              <p className="mt-1 text-xs text-muted-foreground">Add these to your public website.</p>
              <ul className="mt-3 space-y-2 text-sm">
                {portalLinksForTenant(tenant.slug).slice(0, 4).map((link) => (
                  <li key={link.href}>
                    <p className="font-medium text-foreground/90">{link.label}</p>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-xs text-primary hover:text-foreground"
                    >
                      {link.href}
                    </a>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/settings" className="mt-3 inline-block text-xs font-semibold text-primary hover:text-foreground">
                All links in settings
              </Link>
            </CardBody>
          </Card>
        </div>
      </section>

      <Card>
        <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent event registrations</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Completed registrations from your portal.</p>
          </div>
          <Link href="/dashboard/events" className="shrink-0 text-sm font-semibold text-primary hover:text-foreground">
            Events
          </Link>
        </div>
        <CardBody className="pt-4">
          {dashboard.recentRegistrations.length === 0 ? (
            <EmptyPilotState tenantSlug={tenant.slug} portalUrl={portalUrl} kind="registrations" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Registrant</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Source / intent</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentRegistrations.map((registration) => (
                    <tr key={registration.id} className="border-b border-border/60">
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        <span title={formatDate(registration.createdAt)}>{formatRelativeTime(registration.createdAt)}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">
                          {registration.contact.firstName} {registration.contact.lastName}
                        </p>
                        <p className="text-muted-foreground">{registration.contact.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{registration.event.title}</p>
                        <p className="font-mono text-xs text-muted-foreground">/register/{registration.event.slug}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {registration.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-foreground/80">
                        {contactSourceLabel(registration.contact.source)}
                        {registration.contact.interestType && (
                          <span className="text-muted-foreground">
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
        </CardBody>
      </Card>

      {financial.recentPayments.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recent payments</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Membership, event, and donation transactions.</p>
            </div>
            <Link href="/dashboard/payments" className="shrink-0 text-sm font-semibold text-primary hover:text-foreground">
              All payments
            </Link>
          </div>
          <CardBody className="pt-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Person</th>
                    <th className="py-2 pr-4">Purpose</th>
                    <th className="py-2 pr-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {financial.recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/60">
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        <span title={formatDate(payment.paidAt ?? payment.createdAt)}>
                          {formatRelativeTime(payment.paidAt ?? payment.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {payment.contact ? (
                          <>
                            <p className="font-medium text-foreground">
                              {payment.contact.firstName} {payment.contact.lastName}
                            </p>
                            <p className="text-muted-foreground">{payment.contact.email}</p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-foreground/80">{payment.purpose}</td>
                      <td className="py-3 pr-4 font-medium text-foreground">{formatCents(payment.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {dashboard.upcomingEvents.length > 0 && (
        <details className="jg-card p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Upcoming published events ({dashboard.upcomingEvents.length})
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            {dashboard.upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0"
              >
                <span className="font-medium text-foreground">{event.title}</span>
                <span className="text-muted-foreground">
                  {formatDate(event.startsAt)} · {event._count.registrations} registrations
                </span>
                <Link
                  href={`/dashboard/events/${event.id}/registrations`}
                  className="font-semibold text-primary hover:text-foreground"
                >
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
  icon: Icon,
}: {
  label: string;
  value: number | string;
  detail: string;
  href: string;
  highlight: boolean;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className={highlight ? "jg-metric group" : "jg-metric-muted group"}>
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
          highlight ? "bg-primary/10 text-primary group-hover:bg-primary/15" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className={`text-2xl font-bold tracking-tight ${highlight ? "text-foreground" : "text-muted-foreground"}`}>
        {value}
      </div>
      <div className="mt-1.5 text-sm font-bold text-foreground/90">{label}</div>
      <div className="mt-1 text-xs leading-5 font-medium text-muted-foreground">{detail}</div>
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
      <div className="jg-surface-muted p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No contacts for {tenantSlug} yet</p>
        <p className="mt-2">
          Test that website traffic is reaching JanaGana: open your portal contact form in an incognito window, submit a
          unique email, then refresh this page.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            Portal contact:{" "}
            <a href={contactPath} className="break-all font-medium text-primary hover:text-foreground">
              {contactPath}
            </a>
          </li>
          <li>Wrong site (e.g. TPW newsletter only) will not appear here.</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="jg-surface-muted p-5 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">No event registrations yet</p>
      <p className="mt-2">
        Publish an event, then register in incognito via{" "}
        <a href={eventsPath} className="font-medium text-primary hover:text-foreground">
          {eventsPath}
        </a>
        .
      </p>
    </div>
  );
}
