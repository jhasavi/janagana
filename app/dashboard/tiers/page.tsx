import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, CreditCard, TrendingUp, UserCheck, Users } from "lucide-react";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
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
import {
  createMembershipTier,
  enrollMembership,
  listMembershipAdminData,
  recordMembershipPayment,
  updateMembershipStatus,
} from "@/lib/actions/membership-tiers";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";

const MEMBERSHIP_STATUSES = ["PENDING", "ACTIVE", "INACTIVE", "EXPIRED", "CANCELED"] as const;
const PAYMENT_STATUSES = ["PAID", "PENDING", "FAILED", "REFUNDED", "WAIVED"] as const;
const PAYMENT_METHODS = ["OFFLINE", "CASH", "CHECK", "CARD", "BANK_TRANSFER", "STRIPE", "OTHER"] as const;

function centsFromDollars(value: FormDataEntryValue | null) {
  const dollars = Number(String(value ?? "0"));
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : NaN;
}

function dateFromForm(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? new Date(`${raw}T00:00:00`) : null;
}

function statusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "ACTIVE" || status === "PAID") return "success";
  if (status === "PENDING") return "warning";
  if (status === "EXPIRED" || status === "FAILED") return "danger";
  return "default";
}

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const adminData = await listMembershipAdminData();
  const data = adminData.ok ? adminData.data : null;

  async function createTierAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await createMembershipTier(
      {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        amountCents: centsFromDollars(formData.get("amountDollars")),
        interval: String(formData.get("interval") ?? "ANNUAL"),
        active: formData.get("active") === "on",
      },
      { tenantIdHint: tenantHint }
    );

    if (!result.ok) {
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/tiers?error=${encodeURIComponent(result.error)}`);
      }
      redirect(`/dashboard/tiers?error=${encodeURIComponent(result.error)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/tiers?success=tier");
  }

  async function enrollMembershipAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await enrollMembership(
      {
        contactId: String(formData.get("contactId") ?? ""),
        tierId: String(formData.get("tierId") ?? ""),
        status: String(formData.get("status") ?? "ACTIVE"),
        startsAt: dateFromForm(formData.get("startsAt")) ?? new Date(),
        expiresAt: dateFromForm(formData.get("expiresAt")),
        autoRenew: formData.get("autoRenew") === "on",
        notes: String(formData.get("notes") ?? ""),
        initialPaymentAmountCents: centsFromDollars(formData.get("initialPaymentDollars")),
        initialPaymentMethod: String(formData.get("initialPaymentMethod") ?? "OFFLINE"),
        initialPaymentStatus: String(formData.get("initialPaymentStatus") ?? "PAID"),
        initialPaymentPaidAt: dateFromForm(formData.get("initialPaymentPaidAt")),
        initialPaymentNotes: String(formData.get("initialPaymentNotes") ?? ""),
      },
      { tenantIdHint: tenantHint }
    );

    if (!result.ok) {
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/tiers?error=${encodeURIComponent(result.error)}`);
      }
      redirect(`/dashboard/tiers?error=${encodeURIComponent(result.error)}`);
    }

    redirectWithActiveTenant(result.data.tenantId, "/dashboard/tiers?success=enrolled");
  }

  async function recordPaymentAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await recordMembershipPayment(
      {
        membershipId: String(formData.get("membershipId") ?? ""),
        amountCents: centsFromDollars(formData.get("amountDollars")),
        method: String(formData.get("method") ?? "OFFLINE"),
        status: String(formData.get("status") ?? "PAID"),
        paidAt: dateFromForm(formData.get("paidAt")),
        providerRef: String(formData.get("providerRef") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      },
      { tenantIdHint: tenantHint }
    );

    if (!result.ok) {
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/tiers?error=${encodeURIComponent(result.error)}`);
      }
      redirect(`/dashboard/tiers?error=${encodeURIComponent(result.error)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, "/dashboard/tiers?success=payment");
    }
    redirect("/dashboard/tiers?success=payment");
  }

  async function updateStatusAction(formData: FormData) {
    "use server";

    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await updateMembershipStatus(
      {
        membershipId: String(formData.get("membershipId") ?? ""),
        status: String(formData.get("status") ?? "ACTIVE"),
      },
      { tenantIdHint: tenantHint }
    );

    if (!result.ok) {
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/tiers?error=${encodeURIComponent(result.error)}`);
      }
      redirect(`/dashboard/tiers?error=${encodeURIComponent(result.error)}`);
    }

    if (tenantHint) {
      redirectWithActiveTenant(tenantHint, "/dashboard/tiers?success=status");
    }
    redirect("/dashboard/tiers?success=status");
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Memberships"
        description="Manage membership tiers, enroll contacts as formal members, and record membership payments before public checkout is opened."
        actions={
          <ButtonLink href="/dashboard/memberships/renewals" size="sm">
            Open renewals desk →
          </ButtonLink>
        }
      />

      {!adminData.ok && <Alert variant="error">{adminData.error}</Alert>}
      {params.error && <Alert variant="error">{params.error}</Alert>}
      {params.success === "tier" && <Alert variant="success">Membership tier saved.</Alert>}
      {params.success === "enrolled" && <Alert variant="success">Member enrolled.</Alert>}
      {params.success === "payment" && <Alert variant="success">Payment recorded.</Alert>}
      {params.success === "status" && <Alert variant="success">Membership status updated.</Alert>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={UserCheck} tone="success" label="Active members" value={String(data.summary.activeMemberships)} />
            <StatCard icon={Clock3} tone="warning" label="Expiring in 30d" value={String(data.summary.expiringSoon)} />
            <StatCard icon={Users} tone="accent" label="Expired/lapsed" value={String(data.summary.expired)} />
            <StatCard icon={TrendingUp} tone="primary" label="Collected" value={formatCents(data.summary.collectedCents)} />
            <StatCard icon={CreditCard} tone="warning" label="Pending" value={formatCents(data.summary.pendingCents)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardBody>
                <h2 className="text-base font-semibold text-foreground">Create a tier</h2>
                <form action={createTierAction} className="mt-4 grid gap-3">
                  {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                  <FormField label="Tier name">
                    <Input name="name" required placeholder="Tier name, e.g. Annual family" />
                  </FormField>
                  <FormField label="Description">
                    <Textarea name="description" rows={2} placeholder="Description visible to admins for now" />
                  </FormField>
                  <FormGrid>
                    <FormField label="Amount">
                      <Input name="amountDollars" required type="number" min="0" step="0.01" placeholder="Amount" />
                    </FormField>
                    <FormField label="Interval">
                      <Select name="interval" defaultValue="ANNUAL">
                        <option value="ANNUAL">Annual</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="ONE_TIME">One-time</option>
                      </Select>
                    </FormField>
                  </FormGrid>
                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input name="active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-input" />
                    Active for new enrollments
                  </label>
                  <Button type="submit">Save tier</Button>
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="text-base font-semibold text-foreground">Enroll a member</h2>
                <form action={enrollMembershipAction} className="mt-4 grid gap-3">
                  {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                  <FormGrid>
                    <FormField label="Contact">
                      <Select name="contactId" required>
                        <option value="">Choose contact</option>
                        {data.contacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.lastName}, {contact.firstName} - {contact.email}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Tier">
                      <Select name="tierId" required>
                        <option value="">Choose tier</option>
                        {data.tiers
                          .filter((tier) => tier.active)
                          .map((tier) => (
                            <option key={tier.id} value={tier.id}>
                              {tier.name} - {formatCents(tier.amountCents)} / {tier.interval.toLowerCase()}
                            </option>
                          ))}
                      </Select>
                    </FormField>
                  </FormGrid>
                  <FormGrid className="md:grid-cols-4">
                    <FormField label="Status">
                      <Select name="status" defaultValue="ACTIVE">
                        {MEMBERSHIP_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Starts">
                      <Input name="startsAt" required type="date" />
                    </FormField>
                    <FormField label="Expires">
                      <Input name="expiresAt" type="date" />
                    </FormField>
                    <label className="inline-flex items-center gap-2 self-end rounded-xl border border-border px-3 py-2.5 text-sm text-foreground">
                      <input name="autoRenew" type="checkbox" className="h-4 w-4 rounded border-input" />
                      Auto-renew
                    </label>
                  </FormGrid>
                  <FormField label="Notes">
                    <Textarea name="notes" rows={2} placeholder="Membership notes" />
                  </FormField>
                  <FormGrid className="md:grid-cols-4">
                    <FormField label="Initial payment">
                      <Input name="initialPaymentDollars" type="number" min="0" step="0.01" defaultValue="0" placeholder="Initial payment" />
                    </FormField>
                    <FormField label="Method">
                      <Select name="initialPaymentMethod" defaultValue="OFFLINE">
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method.replace(/_/g, " ")}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Status">
                      <Select name="initialPaymentStatus" defaultValue="PAID">
                        {PAYMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Paid on">
                      <Input name="initialPaymentPaidAt" type="date" />
                    </FormField>
                  </FormGrid>
                  <FormField label="Payment memo">
                    <Input name="initialPaymentNotes" placeholder="Payment memo, check number, or receipt note" />
                  </FormField>
                  <Button
                    type="submit"
                    disabled={data.contacts.length === 0 || data.tiers.filter((tier) => tier.active).length === 0}
                  >
                    Enroll member
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody>
              <h2 className="text-base font-semibold text-foreground">Membership tiers</h2>
              {data.tiers.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No tiers yet" description="Create your first membership tier before enrolling members." />
                </div>
              ) : (
                <DataTable className="mt-4">
                  <DataTableHead>
                    <DataTableHeaderCell>Tier</DataTableHeaderCell>
                    <DataTableHeaderCell>Price</DataTableHeaderCell>
                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                    <DataTableHeaderCell>Members</DataTableHeaderCell>
                  </DataTableHead>
                  <DataTableBody>
                    {data.tiers.map((tier) => (
                      <DataTableRow key={tier.id}>
                        <DataTableCell>
                          <p className="font-medium text-foreground">{tier.name}</p>
                          {tier.description && <p className="mt-1 max-w-xl text-xs text-muted-foreground">{tier.description}</p>}
                        </DataTableCell>
                        <DataTableCell className="text-foreground">
                          {formatCents(tier.amountCents)} / {tier.interval.toLowerCase()}
                        </DataTableCell>
                        <DataTableCell>
                          <Badge variant={tier.active ? "success" : "default"}>{tier.active ? "Active" : "Inactive"}</Badge>
                        </DataTableCell>
                        <DataTableCell className="text-foreground">{tier._count.memberships}</DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-base font-semibold text-foreground">Member enrollments</h2>
              {data.memberships.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No formal memberships yet"
                    description="Enroll a contact above to start the member ledger."
                  />
                </div>
              ) : (
                <DataTable className="mt-4">
                  <DataTableHead>
                    <DataTableHeaderCell>Member</DataTableHeaderCell>
                    <DataTableHeaderCell>Tier</DataTableHeaderCell>
                    <DataTableHeaderCell>Term</DataTableHeaderCell>
                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                    <DataTableHeaderCell>Recent payments</DataTableHeaderCell>
                    <DataTableHeaderCell>Record payment</DataTableHeaderCell>
                  </DataTableHead>
                  <DataTableBody>
                    {data.memberships.map((membership) => (
                      <DataTableRow key={membership.id}>
                        <DataTableCell>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                              {(membership.contact.firstName.charAt(0) + membership.contact.lastName.charAt(0)).toUpperCase()}
                            </span>
                            <span>
                              <span className="block font-bold text-foreground">
                                {membership.contact.firstName} {membership.contact.lastName}
                              </span>
                              <span className="block text-muted-foreground">{membership.contact.email}</span>
                              <span className="block text-xs text-muted-foreground">{membership.contact.phone ?? "No phone"}</span>
                            </span>
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <p className="font-medium text-foreground">{membership.tier.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCents(membership.tier.amountCents)} / {membership.tier.interval.toLowerCase()}
                          </p>
                          {membership.autoRenew && <p className="mt-1 text-xs text-primary">Auto-renew</p>}
                        </DataTableCell>
                        <DataTableCell className="text-foreground">
                          <p>Starts {formatDate(membership.startsAt)}</p>
                          <p className="text-xs text-muted-foreground">
                            {membership.expiresAt ? `Expires ${formatDate(membership.expiresAt)}` : "No expiration"}
                          </p>
                          {membership.notes && <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">{membership.notes}</p>}
                        </DataTableCell>
                        <DataTableCell>
                          <Badge variant={statusVariant(membership.status)}>{membership.status}</Badge>
                          <form action={updateStatusAction} className="mt-2 grid gap-1">
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="membershipId" value={membership.id} />
                            <Select name="status" defaultValue={membership.status} className="text-xs">
                              {MEMBERSHIP_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </Select>
                            <Button type="submit" size="sm" variant="secondary">
                              Update
                            </Button>
                          </form>
                        </DataTableCell>
                        <DataTableCell>
                          {membership.payments.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No payments yet</p>
                          ) : (
                            <ul className="space-y-1">
                              {membership.payments.map((payment) => (
                                <li key={payment.id} className="text-xs text-foreground">
                                  <span className="font-medium">{formatCents(payment.amountCents)}</span>
                                  {" · "}
                                  <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                                  {" · "}
                                  {payment.method.replace(/_/g, " ")}
                                  <p className="text-muted-foreground">
                                    {payment.paidAt ? formatRelativeTime(payment.paidAt) : formatRelativeTime(payment.createdAt)}
                                  </p>
                                  {payment.receipt && (
                                    <p className="font-mono text-[10px]">
                                      <Link
                                        href={`/dashboard/payments/receipts/${payment.receipt.id}`}
                                        className="font-semibold text-primary hover:text-foreground"
                                      >
                                        {payment.receipt.receiptNumber}
                                      </Link>
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </DataTableCell>
                        <DataTableCell className="min-w-[220px]">
                          <details>
                            <summary className="cursor-pointer text-xs font-medium text-primary underline">Add payment</summary>
                            <form action={recordPaymentAction} className="mt-2 grid gap-2 rounded-xl border border-border bg-muted/30 p-2">
                              {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                              <input type="hidden" name="membershipId" value={membership.id} />
                              <Input
                                name="amountDollars"
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Amount"
                                className="text-xs"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Select name="method" defaultValue="OFFLINE" className="text-xs">
                                  {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>
                                      {method.replace(/_/g, " ")}
                                    </option>
                                  ))}
                                </Select>
                                <Select name="status" defaultValue="PAID" className="text-xs">
                                  {PAYMENT_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <Input name="paidAt" type="date" className="text-xs" />
                              <Input name="providerRef" placeholder="Reference" className="text-xs" />
                              <Textarea name="notes" rows={2} placeholder="Payment notes" className="text-xs" />
                              <Button type="submit" size="sm">
                                Record payment
                              </Button>
                            </form>
                          </details>
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </section>
  );
}
