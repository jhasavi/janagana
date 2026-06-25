import Link from "next/link";
import { redirect } from "next/navigation";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
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
  { value: "needs_reminder", label: "Needs reminder" },
  { value: "recently_paid", label: "Recently paid" },
  { value: "no_email", label: "No email" },
];

function filterHref(filter: RenewalFilter) {
  return filter === "all" ? "/dashboard/memberships/renewals" : `/dashboard/memberships/renewals?filter=${filter}`;
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-900";
  if (status === "PENDING") return "bg-amber-100 text-amber-900";
  if (status === "EXPIRED") return "bg-red-100 text-red-900";
  if (status === "CANCELED" || status === "INACTIVE") return "bg-gray-100 text-gray-700";
  return "bg-slate-100 text-slate-800";
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
      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">Community OS</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Membership renewals desk</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              See who is active, expiring soon, or lapsed — and queue renewal reminders without leaving the admin
              dashboard.
            </p>
          </div>
          <Link
            href="/dashboard/tiers"
            className="shrink-0 text-sm font-semibold text-teal-900 hover:text-slate-950"
          >
            ← Membership plans & enrollment
          </Link>
        </div>
      </header>

      {params.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{params.error}</p>
      )}
      {params.success === "reminder" && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Renewal reminder queued in the communications outbox. It will not send until email delivery is configured.
        </p>
      )}

      {desk && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard label="Active members" value={desk.summary.activeMembers} href={filterHref("active")} />
            <SummaryCard
              label="Expiring in 30 days"
              value={desk.summary.expiringIn30Days}
              href={filterHref("expiring_30")}
              highlight={desk.summary.expiringIn30Days > 0}
            />
            <SummaryCard
              label="Expiring in 60 days"
              value={desk.summary.expiringIn60Days}
              href={filterHref("expiring_60")}
            />
            <SummaryCard
              label="Expiring in 90 days"
              value={desk.summary.expiringIn90Days}
              href={filterHref("expiring_90")}
            />
            <SummaryCard
              label="Expired members"
              value={desk.summary.expiredMembers}
              href={filterHref("expired")}
              highlight={desk.summary.expiredMembers > 0}
            />
            <SummaryCard
              label="Recent membership payments"
              value={desk.summary.recentlyPaidCount}
              href={filterHref("recently_paid")}
            />
          </section>

          <section className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active = activeFilter === item.value;
              return (
                <Link
                  key={item.value}
                  href={filterHref(item.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    active
                      ? "bg-slate-950 text-white"
                      : "bg-white text-slate-700 ring-1 ring-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </section>

          <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">Renewals table</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {filteredRows.length} member{filteredRows.length === 1 ? "" : "s"}
                {activeFilter !== "all" ? ` · filter: ${FILTERS.find((f) => f.value === activeFilter)?.label}` : ""}
              </p>
            </div>

            {desk.summary.totalEnrollments === 0 ? (
              <EmptyPanel title="No membership records yet">
                <p>Enroll your first member on the memberships page, then return here to track renewals.</p>
                <Link href="/dashboard/tiers" className="mt-3 inline-block font-semibold text-teal-900 hover:text-slate-950">
                  Go to memberships →
                </Link>
              </EmptyPanel>
            ) : filteredRows.length === 0 ? (
              <EmptyPanel title={emptyTitleForFilter(activeFilter)}>
                <p>{emptyBodyForFilter(activeFilter)}</p>
              </EmptyPanel>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Member</th>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Term</th>
                      <th className="px-5 py-3">Expiration</th>
                      <th className="px-5 py-3">Last payment</th>
                      <th className="px-5 py-3">Reminder</th>
                      <th className="px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.membershipId} className="border-b border-stone-100 align-top">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-950">
                            {row.firstName} {row.lastName}
                          </p>
                          <p className="text-slate-600">{row.email}</p>
                          <p className="text-xs text-slate-500">{row.phone ?? "No phone"}</p>
                          {!row.hasUsableEmail && (
                            <p className="mt-1 text-xs font-medium text-amber-800">No usable email for reminder</p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{row.tierName}</p>
                          <p className="text-xs text-slate-600">
                            {formatCents(row.tierAmountCents)} / {row.tierInterval.toLowerCase()}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusClass(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          <p>Starts {formatDate(row.startsAt)}</p>
                          <p className="text-xs text-slate-500">
                            {row.expirationKnown && row.expiresAt
                              ? `Ends ${formatDate(row.expiresAt)}`
                              : "No end date on file"}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <p className={`font-medium ${row.isExpired ? "text-red-800" : row.isExpiringWithin30 ? "text-amber-800" : "text-slate-800"}`}>
                            {expirationLabel(row)}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {row.lastPaymentAt ? (
                            <>
                              <p className="font-medium">{formatCents(row.lastPaymentAmountCents ?? 0)}</p>
                              <p className="text-xs text-slate-500">{formatRelativeTime(row.lastPaymentAt)}</p>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500">No payment recorded</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          <p className="text-xs font-medium">{reminderLabel(row.reminderStatus)}</p>
                          {row.lastReminderAt && (
                            <p className="text-xs text-slate-500">{formatRelativeTime(row.lastReminderAt)}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 min-w-[180px]">
                          <div className="flex flex-col gap-2">
                            <Link
                              href={`/dashboard/members/${row.contactId}`}
                              className="text-xs font-semibold text-teal-900 hover:text-slate-950"
                            >
                              View contact
                            </Link>
                            <Link
                              href="/dashboard/payments"
                              className="text-xs font-semibold text-teal-900 hover:text-slate-950"
                            >
                              View payments
                            </Link>
                            {row.hasUsableEmail ? (
                              <form action={queueReminderAction}>
                                {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                                <input type="hidden" name="membershipId" value={row.membershipId} />
                                <input type="hidden" name="returnFilter" value={activeFilter} />
                                <button
                                  type="submit"
                                  disabled={row.reminderStatus === "recently_queued"}
                                  className="rounded bg-slate-950 px-2 py-1 text-xs font-medium text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-stone-300"
                                >
                                  {row.reminderStatus === "recently_queued" ? "Reminder queued" : "Queue reminder"}
                                </button>
                              </form>
                            ) : (
                              <p className="text-xs text-amber-800">Add a valid email before queueing</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-xs text-slate-500">
            Expiration uses <code className="rounded bg-stone-100 px-1">Membership.expiresAt</code> when set at
            enrollment. One-time plans may have no end date — those members appear as active without an expiration
            window.
          </p>
        </>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border p-4 shadow-sm transition-colors hover:border-teal-300 ${
        highlight ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-50"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </Link>
  );
}

function EmptyPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-dashed border-stone-200 bg-stone-50 p-6 text-sm text-slate-700">
      <p className="font-medium text-slate-950">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
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
    default:
      return "Try another filter or enroll members with expiration dates.";
  }
}
