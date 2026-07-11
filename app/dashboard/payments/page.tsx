import Link from "next/link";
import { CalendarDays, HeartHandshake, Users, Wallet } from "lucide-react";
import { getTenantFinancialSummary } from "@/lib/dashboard/financial-summary";
import { resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

function purposeLabel(purpose: string) {
  switch (purpose) {
    case "MEMBERSHIP":
      return "Membership";
    case "EVENT":
      return "Event";
    case "DONATION":
      return "Donation";
    default:
      return "Other";
  }
}

function statusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "warning";
  if (status === "FAILED") return "danger";
  return "default";
}

function filterHref(base: string, params: Record<string, string>) {
  const url = new URL(base, "http://local");
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}`;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ purpose?: string; status?: string }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const filters = {
    purpose: (params.purpose ?? "") as "" | "MEMBERSHIP" | "EVENT" | "DONATION",
    status: (params.status ?? "") as "" | "PAID" | "PENDING" | "FAILED" | "WAIVED" | "REFUNDED",
  };
  const financial = tenant
    ? await getTenantFinancialSummary(tenant.id, {
        purpose: filters.purpose || undefined,
        status: filters.status || undefined,
      })
    : null;

  const basePath = "/dashboard/payments";

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Payments"
        description="Membership dues, event fees, and donations. 0% JanaGana platform fee — card processor fees are separate (donors can cover them at checkout)."
        actions={
          <Link href="/dashboard/tiers" className="text-sm font-semibold text-primary hover:text-foreground">
            Record membership payment
          </Link>
        }
      />

      {financial && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Wallet} tone="primary" label="Total received" value={formatCents(financial.totalRevenueCents)} />
          <StatCard icon={Users} tone="accent" label="Membership" value={formatCents(financial.membershipRevenueCents)} detail={`${financial.membershipPaymentCount} payments`} />
          <StatCard icon={CalendarDays} tone="success" label="Events" value={formatCents(financial.eventRevenueCents)} detail={`${financial.eventPaymentCount} payments`} />
          <StatCard icon={HeartHandshake} tone="warning" label="Donations" value={formatCents(financial.donationRevenueCents)} detail={`${financial.donationPaymentCount} payments`} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <FilterChip href={basePath} active={!filters.purpose && !filters.status}>
          All
        </FilterChip>
        {(["MEMBERSHIP", "EVENT", "DONATION"] as const).map((purpose) => (
          <FilterChip
            key={purpose}
            href={filterHref(basePath, { purpose, status: filters.status })}
            active={filters.purpose === purpose}
          >
            {purposeLabel(purpose)}
          </FilterChip>
        ))}
        <FilterChip
          href={filterHref(basePath, { purpose: filters.purpose, status: "PENDING" })}
          active={filters.status === "PENDING"}
        >
          Pending
        </FilterChip>
      </div>

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-foreground">Payment ledger</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filters.purpose || filters.status
              ? `Filtered view${filters.purpose ? ` · ${purposeLabel(filters.purpose)}` : ""}${filters.status ? ` · ${filters.status}` : ""}`
              : "Latest transactions across memberships, events, and donations."}
          </p>

          {!financial || financial.recentPayments.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No payments match these filters"
                description="Record offline dues on Memberships or wait for Stripe checkout to complete."
                action={
                  <Link href="/dashboard/tiers" className="text-sm font-semibold text-primary hover:text-foreground">
                    Go to memberships
                  </Link>
                }
              />
            </div>
          ) : (
            <DataTable className="mt-4">
              <DataTableHead>
                <DataTableHeaderCell>When</DataTableHeaderCell>
                <DataTableHeaderCell>Person</DataTableHeaderCell>
                <DataTableHeaderCell>Purpose</DataTableHeaderCell>
                <DataTableHeaderCell>Amount</DataTableHeaderCell>
                <DataTableHeaderCell>Method</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {financial.recentPayments.map((payment) => (
                  <DataTableRow key={payment.id}>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      <span title={formatDate(payment.paidAt ?? payment.createdAt)}>
                        {formatRelativeTime(payment.paidAt ?? payment.createdAt)}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
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
                    </DataTableCell>
                    <DataTableCell>{purposeLabel(payment.purpose)}</DataTableCell>
                    <DataTableCell className="font-medium">{formatCents(payment.amountCents)}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">{payment.method}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
