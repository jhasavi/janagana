import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertOctagon, CalendarClock, CheckCircle2, UserX } from "lucide-react";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { queueMembershipRenewalReminder } from "@/lib/actions/membership-renewals";
import {
  type RenewalFilter,
  filterMembershipRenewals,
  getMembershipRenewalsDesk,
} from "@/lib/memberships/renewals";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";

const FILTERS: { value: RenewalFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring_30", label: "Expiring 30d" },
  { value: "expiring_60", label: "Expiring 60d" },
  { value: "expiring_90", label: "Expiring 90d" },
  { value: "expired", label: "Expired" },
  { value: "payment_failed", label: "Payment failed" },
  { value: "needs_reminder", label: "Needs reminder" },
  { value: "recently_paid", label: "Recently paid" },
  { value: "no_email", label: "No email" },
];

function filterHref(filter: RenewalFilter) {
  return filter === "all" ? "/dashboard/memberships/renewals" : `/dashboard/memberships/renewals?filter=${filter}`;
}

function statusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING") return "warning";
  if (status === "EXPIRED") return "danger";
  return "default";
}

function reminderLabel(status: string) {
  switch (status) {
    case "recently_queued":
      return "Queued recently";
    case "queued":
      return "Queued";
    case "sent":
      return "Sent earlier";
    case "failed":
      return "Failed";
    default:
      return "None";
  }
}

function expirationLabel(row: Awaited<ReturnType<typeof getMembershipRenewalsDesk>>["rows"][number]) {
  if (!row.expirationKnown) return "No expiration date";
  if (row.isExpired && row.daysExpired !== null) {
    return `Expired ${row.daysExpired}d ago`;
  }
  if (row.daysUntilExpiration !== null) {
    return row.daysUntilExpiration === 0 ? "Expires today" : `${row.daysUntilExpiration}d left`;
  }
  return "—";
}

export default async function MembershipRenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const desk = tenant ? await getMembershipRenewalsDesk(tenant.id) : null;

  const filterParam = params.filter ?? "all";
  const activeFilter = FILTERS.some((item) => item.value === filterParam)
    ? (filterParam as RenewalFilter)
    : "all";
  const filteredRows = desk ? filterMembershipRenewals(desk.rows, activeFilter) : [];

  async function queueReminderAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const membershipId = String(formData.get("membershipId") ?? "");
    const returnFilter = String(formData.get("returnFilter") ?? "all");

    const result = await queueMembershipRenewalReminder({ membershipId }, { tenantIdHint: tenantHint });

    const base = `/dashboard/memberships/renewals${returnFilter && returnFilter !== "all" ? `?filter=${encodeURIComponent(returnFilter)}` : ""}`;

    if (!result.ok) {
      const suffix = `${base.includes("?") ? "&" : "?"}error=${encodeURIComponent(result.error)}`;
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `${base}${suffix}`);
      }
      redirect(`${base}${suffix}`);
    }

    const suffix = `${base.includes("?") ? "&" : "?"}success=reminder`;
    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, `${base}${suffix}`);
    }
    redirect(`${base}${suffix}`);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Programs"
        title="Membership renewals desk"
        description="See who is active, expiring soon, or lapsed — and queue renewal reminders without leaving the admin dashboard."
        actions={
          <Link href="/dashboard/tiers" className="text-sm font-semibold text-primary hover:text-foreground">
            ← Membership plans & enrollment
          </Link>
        }
      />

      {params.error && <Alert variant="error">{params.error}</Alert>}
      {params.success === "reminder" && (
        <Alert variant="success">
          Renewal reminder queued in the communications outbox. It will not send until email delivery is configured.
        </Alert>
      )}

      {desk && (
        <>
          {desk.summary.paymentIssuesCount > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-destructive">
                <AlertOctagon className="h-4 w-4" />
              </span>
              <p className="text-sm leading-6 text-foreground">
                <span className="font-bold">
                  {desk.summary.paymentIssuesCount} membership{desk.summary.paymentIssuesCount === 1 ? "" : "s"} with a
                  failed charge
                </span>{" "}
                <span className="text-muted-foreground">
                  need dunning follow-up before they lapse.{" "}
                  <Link href={filterHref("payment_failed")} className="font-semibold text-destructive underline">
                    Review now
                  </Link>
                </span>
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Link href={filterHref("active")}>
              <StatCard icon={CheckCircle2} tone="success" label="Active members" value={String(desk.summary.activeMembers)} />
            </Link>
            <Link href={filterHref("expiring_30")}>
              <StatCard icon={CalendarClock} tone="warning" label="Expiring in 30 days" value={String(desk.summary.expiringIn30Days)} />
            </Link>
            <Link href={filterHref("expiring_60")}>
              <StatCard icon={CalendarClock} tone="warning" label="Expiring in 60 days" value={String(desk.summary.expiringIn60Days)} />
            </Link>
            <Link href={filterHref("expiring_90")}>
              <StatCard icon={CalendarClock} tone="primary" label="Expiring in 90 days" value={String(desk.summary.expiringIn90Days)} />
            </Link>
            <Link href={filterHref("expired")}>
              <StatCard icon={UserX} tone="accent" label="Expired members" value={String(desk.summary.expiredMembers)} />
            </Link>
            <Link href={filterHref("payment_failed")}>
              <StatCard icon={AlertOctagon} tone="warning" label="Payment failed" value={String(desk.summary.paymentIssuesCount)} />
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <FilterChip key={item.value} href={filterHref(item.value)} active={activeFilter === item.value}>
                {item.label}
              </FilterChip>
            ))}
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground">Renewals table</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {filteredRows.length} member{filteredRows.length === 1 ? "" : "s"}
                {activeFilter !== "all" ? ` · filter: ${FILTERS.find((f) => f.value === activeFilter)?.label}` : ""}
              </p>
            </CardHeader>

            {desk.summary.totalEnrollments === 0 ? (
              <CardBody>
                <EmptyState
                  title="No membership records yet"
                  description="Enroll your first member on the memberships page, then return here to track renewals."
                  action={
                    <Link href="/dashboard/tiers" className="text-sm font-semibold text-primary hover:text-foreground">
                      Go to memberships →
                    </Link>
                  }
                />
              </CardBody>
            ) : filteredRows.length === 0 ? (
              <CardBody>
                <EmptyState title={emptyTitleForFilter(activeFilter)} description={emptyBodyForFilter(activeFilter)} />
              </CardBody>
            ) : (
              <CardBody className="pt-0">
                <DataTable>
                  <DataTableHead>
                    <DataTableHeaderCell>Member</DataTableHeaderCell>
                    <DataTableHeaderCell>Plan</DataTableHeaderCell>
                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                    <DataTableHeaderCell>Term</DataTableHeaderCell>
                    <DataTableHeaderCell>Expiration</DataTableHeaderCell>
                    <DataTableHeaderCell>Last payment</DataTableHeaderCell>
                    <DataTableHeaderCell>Reminder</DataTableHeaderCell>
                    <DataTableHeaderCell>Actions</DataTableHeaderCell>
                  </DataTableHead>
                  <DataTableBody>
                    {filteredRows.map((row) => (
                      <DataTableRow key={row.membershipId}>
                        <DataTableCell>
                          <p className="font-medium text-foreground">
                            {row.firstName} {row.lastName}
                          </p>
                          <p className="text-muted-foreground">{row.email}</p>
                          <p className="text-xs text-muted-foreground">{row.phone ?? "No phone"}</p>
                          {!row.hasUsableEmail && (
                            <p className="mt-1 text-xs font-medium text-amber-800">No usable email for reminder</p>
                          )}
                        </DataTableCell>
                        <DataTableCell>
                          <p className="font-medium text-foreground">{row.tierName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCents(row.tierAmountCents)} / {row.tierInterval.toLowerCase()}
                          </p>
                        </DataTableCell>
                        <DataTableCell>
                          <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                        </DataTableCell>
                        <DataTableCell className="text-foreground">
                          <p>Starts {formatDate(row.startsAt)}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.expirationKnown && row.expiresAt
                              ? `Ends ${formatDate(row.expiresAt)}`
                              : "No end date on file"}
                          </p>
                        </DataTableCell>
                        <DataTableCell>
                          <p
                            className={`font-medium ${row.isExpired ? "text-destructive" : row.isExpiringWithin30 ? "text-amber-800" : "text-foreground"}`}
                          >
                            {expirationLabel(row)}
                          </p>
                        </DataTableCell>
                        <DataTableCell className="text-foreground">
                          {row.lastPaymentAt ? (
                            <>
                              <p className="font-medium">{formatCents(row.lastPaymentAmountCents ?? 0)}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(row.lastPaymentAt)}</p>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">No payment recorded</span>
                          )}
                          {row.hasPaymentIssue && (
                            <div className="mt-1.5">
                              <Badge variant="danger">
                                Failed {formatCents(row.lastFailedPaymentAmountCents ?? 0)}
                                {row.lastFailedPaymentAt ? ` · ${formatRelativeTime(row.lastFailedPaymentAt)}` : ""}
                              </Badge>
                            </div>
                          )}
                        </DataTableCell>
                        <DataTableCell className="text-foreground">
                          <p className="text-xs font-medium">{reminderLabel(row.reminderStatus)}</p>
                          {row.lastReminderAt && (
                            <p className="text-xs text-muted-foreground">{formatRelativeTime(row.lastReminderAt)}</p>
                          )}
                        </DataTableCell>
                        <DataTableCell className="min-w-[180px]">
                          <div className="flex flex-col gap-2">
                            <Link
                              href={`/dashboard/members/${row.contactId}`}
                              className="text-xs font-semibold text-primary hover:text-foreground"
                            >
                              View contact
                            </Link>
                            <Link
                              href="/dashboard/payments"
                              className="text-xs font-semibold text-primary hover:text-foreground"
                            >
                              View payments
                            </Link>
                            {row.hasUsableEmail ? (
                              <form action={queueReminderAction}>
                                {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                                <input type="hidden" name="membershipId" value={row.membershipId} />
                                <input type="hidden" name="returnFilter" value={activeFilter} />
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={row.reminderStatus === "recently_queued"}
                                >
                                  {row.reminderStatus === "recently_queued" ? "Reminder queued" : "Queue reminder"}
                                </Button>
                              </form>
                            ) : (
                              <p className="text-xs text-amber-800">Add a valid email before queueing</p>
                            )}
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </CardBody>
            )}
          </Card>

          <p className="text-xs text-muted-foreground">
            Expiration uses <code className="rounded bg-muted px-1">Membership.expiresAt</code> when set at enrollment.
            One-time plans may have no end date — those members appear as active without an expiration window.
          </p>
        </>
      )}
    </section>
  );
}

function emptyTitleForFilter(filter: RenewalFilter) {
  switch (filter) {
    case "expired":
      return "No expired members";
    case "expiring_30":
    case "expiring_60":
    case "expiring_90":
      return "No members expiring in this window";
    case "no_email":
      return "All members have a usable email";
    case "recently_paid":
      return "No recent membership payments";
    case "payment_failed":
      return "No failed charges right now";
    case "needs_reminder":
      return "No members need a renewal reminder right now";
    case "active":
      return "No active members";
    default:
      return "No matching members";
  }
}

function emptyBodyForFilter(filter: RenewalFilter) {
  switch (filter) {
    case "expired":
      return "Good news — no lapsed memberships in this filter.";
    case "expiring_30":
    case "expiring_60":
    case "expiring_90":
      return "No active memberships with a known expiration date in this window.";
    case "needs_reminder":
      return "Everyone expiring soon either has a recent reminder queued or needs an email address first.";
    case "payment_failed":
      return "Every charge on file went through — nothing needs dunning follow-up.";
    default:
      return "Try another filter or enroll members with expiration dates.";
  }
}
