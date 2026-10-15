import { notFound } from "next/navigation";
import { Building2, HandCoins, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { getCurrentUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { getPlatformTipsReport } from "@/lib/dashboard/platform-tips-report";
import { formatMoneyCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * JanaGana operator report: optional donor tips (platform revenue) across all
 * tenants, plus Connect onboarding coverage. Hidden (404) for everyone not in
 * JANAGANA_PLATFORM_ADMIN_EMAILS.
 */
export default async function PlatformTipsPage() {
  const user = await getCurrentUser();
  if (!isPlatformAdmin(user)) notFound();

  const report = await getPlatformTipsReport();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Platform tips"
        description="JanaGana operator view across all organizations. Tips are optional donor contributions to JanaGana; processing recovery offsets Stripe fees billed to the platform on Connect destination charges."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={HandCoins} tone="success" label="Tips (all time, paid)" value={formatMoneyCents(report.totals.tipsCents)} detail={`${report.totals.payments} payments with tip or fee`} />
        <StatCard icon={Receipt} tone="primary" label="Processing recovered" value={formatMoneyCents(report.totals.processingRecoveryCents)} detail="Estimated Stripe fees on org share" />
        <StatCard icon={Building2} tone="accent" label="Orgs on Stripe Connect" value={`${report.connect.active} / ${report.connect.total}`} detail="Accepting payments to their own account" />
      </div>

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">Tips by month (last 12 months)</h2>
          <DataTable className="mt-4">
            <DataTableHead>
              <DataTableHeaderCell>Month</DataTableHeaderCell>
              <DataTableHeaderCell>Tipped payments</DataTableHeaderCell>
              <DataTableHeaderCell>Tips</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {report.months.map((month) => (
                <DataTableRow key={month.month}>
                  <DataTableCell className="font-mono">{month.month}</DataTableCell>
                  <DataTableCell>{month.tippedPayments}</DataTableCell>
                  <DataTableCell>{formatMoneyCents(month.tipsCents)}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">Tips by organization</h2>
          {report.tenantRows.length === 0 ? (
            <EmptyState title="No tips yet" description="Tips appear once organizations accept payments through Stripe Connect." />
          ) : (
            <DataTable className="mt-4">
              <DataTableHead>
                <DataTableHeaderCell>Organization</DataTableHeaderCell>
                <DataTableHeaderCell>Payments</DataTableHeaderCell>
                <DataTableHeaderCell>Org received</DataTableHeaderCell>
                <DataTableHeaderCell>Tips</DataTableHeaderCell>
                <DataTableHeaderCell>Processing recovered</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {report.tenantRows.map((row) => (
                  <DataTableRow key={row.tenantId}>
                    <DataTableCell>
                      <span className="font-medium text-foreground">{row.tenantName}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{row.tenantSlug}</span>
                    </DataTableCell>
                    <DataTableCell>{row.payments}</DataTableCell>
                    <DataTableCell>{formatMoneyCents(row.orgAmountCents)}</DataTableCell>
                    <DataTableCell>{formatMoneyCents(row.tipsCents)}</DataTableCell>
                    <DataTableCell>{formatMoneyCents(row.processingRecoveryCents)}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">Connect onboarding</h2>
          <DataTable className="mt-4">
            <DataTableHead>
              <DataTableHeaderCell>Organization</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {report.connect.tenants.map((tenant) => (
                <DataTableRow key={tenant.id}>
                  <DataTableCell>
                    <span className="font-medium text-foreground">{tenant.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{tenant.slug}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={tenant.stripeConnectChargesEnabled ? "success" : "warning"}>
                      {tenant.stripeConnectStatus}
                    </Badge>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </CardBody>
      </Card>
    </section>
  );
}
