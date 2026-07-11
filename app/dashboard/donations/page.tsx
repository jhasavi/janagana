import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Clock3, Heart, TrendingUp, Users } from "lucide-react";
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
import { FormField, FormGrid, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { listDonationAdminData, recordOfflineDonation } from "@/lib/actions/donations";
import { publicPortalUrl } from "@/lib/environment";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";

const PAYMENT_METHODS = ["OFFLINE", "CASH", "CHECK", "CARD", "BANK_TRANSFER", "OTHER"] as const;

function centsFromDollars(value: FormDataEntryValue | null) {
  const dollars = Number(String(value ?? "0"));
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : NaN;
}

function statusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "warning";
  if (status === "FAILED") return "danger";
  return "default";
}

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const adminData = await listDonationAdminData();
  const data = adminData.ok ? adminData.data : null;
  const portalUrl = tenant ? publicPortalUrl(tenant.slug) : null;

  async function recordDonationAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await recordOfflineDonation(
      {
        contactId: String(formData.get("contactId") ?? ""),
        amountCents: centsFromDollars(formData.get("amountDollars")),
        method: String(formData.get("method") ?? "OFFLINE"),
        status: "PAID",
        paidAt: formData.get("paidAt") ? new Date(`${String(formData.get("paidAt"))}T00:00:00`) : new Date(),
        notes: String(formData.get("notes") ?? ""),
      },
      { tenantIdHint: tenantHint },
    );

    if (!result.ok) {
      const msg = result.error;
      if (tenantHint) redirectWithActiveTenant(tenantHint, `/dashboard/donations?error=${encodeURIComponent(msg)}`);
      redirect(`/dashboard/donations?error=${encodeURIComponent(msg)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/donations?success=recorded");
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Community OS"
        title="Donations"
        description="Track gifts from supporters — online via the public donate page or offline entries recorded here."
        actions={
          <a
            href={`/api/export/giving-summary?year=${new Date().getFullYear()}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted/60"
          >
            Year-end giving summary (CSV)
          </a>
        }
      />

      {portalUrl && (
        <p className="text-sm text-muted-foreground">
          Public donate page:{" "}
          <a href={`${portalUrl}/donate`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:text-foreground">
            {portalUrl}/donate
          </a>
        </p>
      )}

      {params.error && <Alert variant="error">{params.error}</Alert>}
      {params.success === "recorded" && (
        <Alert variant="success">Donation recorded and receipt queued when applicable.</Alert>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success/10 px-4 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-success">
          <BadgeCheck className="h-4 w-4" />
        </span>
        <p className="text-sm leading-6 text-foreground">
          <span className="font-bold">Fees are always visible to donors.</span>{" "}
          <span className="text-muted-foreground">
            JanaGana&apos;s platform fee is $0 — Stripe processing is itemized at checkout, and donors can optionally
            cover it. Nothing is hidden in the total.
          </span>
        </p>
      </div>

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Heart} tone="accent" label="Total received" value={formatCents(data.summary.totalReceivedCents)} />
            <StatCard icon={Users} tone="primary" label="Donations" value={String(data.summary.donationCount)} />
            <StatCard icon={TrendingUp} tone="success" label="This month" value={formatCents(data.summary.thisMonthCents)} />
            <StatCard icon={Clock3} tone="warning" label="Pending online" value={String(data.summary.pendingCount)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardBody>
                <h2 className="text-base font-semibold text-foreground">Record offline donation</h2>
                <p className="mt-1 text-sm text-muted-foreground">Cash, check, or bank transfer received outside Stripe.</p>
                <form action={recordDonationAction} className="mt-4 grid gap-3">
                  {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                  <FormField label="Donor / contact">
                    <Select name="contactId" required>
                      <option value="">Choose donor / contact</option>
                      {data.contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.lastName}, {contact.firstName} — {contact.email}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormGrid>
                    <FormField label="Amount (USD)">
                      <Input name="amountDollars" required type="number" min="0.01" step="0.01" placeholder="Amount (USD)" />
                    </FormField>
                    <FormField label="Method">
                      <Select name="method" defaultValue="CHECK">
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method.replace(/_/g, " ")}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </FormGrid>
                  <FormField label="Paid on">
                    <Input name="paidAt" type="date" />
                  </FormField>
                  <FormField label="Notes">
                    <Textarea name="notes" rows={2} placeholder="Check number, campaign, or thank-you note" />
                  </FormField>
                  <Button type="submit" disabled={data.contacts.length === 0}>
                    Record donation
                  </Button>
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="font-medium text-foreground">Share the donate page</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add a &ldquo;Donate&rdquo; button on your community website linking to the portal donate URL.
                </p>
                {portalUrl && (
                  <p className="mt-2 break-all font-mono text-xs text-primary">{portalUrl}/donate</p>
                )}
                <Link href="/dashboard/settings" className="mt-3 inline-block text-sm font-semibold text-primary hover:text-foreground">
                  Portal links in settings →
                </Link>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground">Donation history</h2>
            </CardHeader>
            {data.donations.length === 0 ? (
              <CardBody>
                <EmptyState
                  title="No donations recorded yet"
                  description="Share the public donate page or record an offline gift above."
                />
              </CardBody>
            ) : (
              <CardBody className="pt-0">
                <DataTable>
                  <DataTableHead>
                    <DataTableHeaderCell>When</DataTableHeaderCell>
                    <DataTableHeaderCell>Donor</DataTableHeaderCell>
                    <DataTableHeaderCell>Amount</DataTableHeaderCell>
                    <DataTableHeaderCell>Method</DataTableHeaderCell>
                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                    <DataTableHeaderCell>Receipt</DataTableHeaderCell>
                  </DataTableHead>
                  <DataTableBody>
                    {data.donations.map((donation) => (
                      <DataTableRow key={donation.id}>
                        <DataTableCell className="whitespace-nowrap text-muted-foreground">
                          <span title={formatDate(donation.paidAt ?? donation.createdAt)}>
                            {formatRelativeTime(donation.paidAt ?? donation.createdAt)}
                          </span>
                        </DataTableCell>
                        <DataTableCell>
                          {donation.contact ? (
                            <Link href={`/dashboard/members/${donation.contact.id}`} className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
                                {(donation.contact.firstName.charAt(0) + donation.contact.lastName.charAt(0)).toUpperCase()}
                              </span>
                              <span>
                                <span className="block font-bold text-foreground hover:text-primary">
                                  {donation.contact.firstName} {donation.contact.lastName}
                                </span>
                                <span className="text-muted-foreground">{donation.contact.email}</span>
                              </span>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Anonymous</span>
                          )}
                        </DataTableCell>
                        <DataTableCell className="font-medium">{formatCents(donation.amountCents)}</DataTableCell>
                        <DataTableCell className="text-muted-foreground">{donation.method.replace(/_/g, " ")}</DataTableCell>
                        <DataTableCell>
                          <Badge variant={statusVariant(donation.status)}>{donation.status}</Badge>
                        </DataTableCell>
                        <DataTableCell className="font-mono text-xs text-muted-foreground">
                          {donation.receiptId && donation.receiptNumber ? (
                            <Link
                              href={`/dashboard/payments/receipts/${donation.receiptId}`}
                              className="font-semibold text-primary hover:text-foreground"
                            >
                              {donation.receiptNumber}
                            </Link>
                          ) : (
                            (donation.receiptNumber ?? "—")
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </CardBody>
            )}
          </Card>
        </>
      )}
    </section>
  );
}
