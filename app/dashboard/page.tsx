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
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { LinkChip } from "@/components/dashboard/link-chip";
import { OperatorWarningsPanel } from "@/components/dashboard/operator-warnings-panel";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { buildTodoItems, TodoList } from "@/components/dashboard/todo-list";
import { TenantIdentityCard } from "@/components/dashboard/tenant-identity-card";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { getUserClerkOrganizations } from "@/lib/auth";
import { buildActivityFeed } from "@/lib/dashboard/activity-feed";
import { getTenantFinancialSummary } from "@/lib/dashboard/financial-summary";
import { getOperatorDashboard } from "@/lib/dashboard/operator-dashboard";
import { buildMappingWarnings, mergeOperatorWarnings } from "@/lib/dashboard/operator-warnings";
import { publicPortalUrl } from "@/lib/environment";
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

  const todoItems = buildTodoItems({
    expiringThisMonth: dashboard.membershipRenewals.expiringThisMonth,
    expiredMembers: dashboard.membershipRenewals.expiredMembers,
    draftEvents: dashboard.draftEvents,
    contactsTotal: dashboard.summary.contactsTotal,
    publishedEvents: dashboard.publishedEvents,
    hasRegistrations: dashboard.summary.eventRegistrationsConfirmed > 0,
  });

  const activityItems = buildActivityFeed({
    recentContacts: dashboard.recentContacts,
    recentRegistrations: dashboard.recentRegistrations,
    recentPayments: financial.recentPayments,
    recentCommunications: dashboard.recentCommunications,
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

      <TodoList items={todoItems} />

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

      <ActivityFeed items={activityItems} />

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">Website links</h2>
          <p className="mt-1 text-xs text-muted-foreground">Add these to your public website.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {portalLinksForTenant(tenant.slug).slice(0, 4).map((link) => (
              <LinkChip key={link.href} href={link.href} label={link.label} />
            ))}
          </div>
          <Link href="/dashboard/settings" className="mt-3 inline-block text-xs font-semibold text-primary hover:text-foreground">
            All links in settings
          </Link>
        </CardBody>
      </Card>

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

