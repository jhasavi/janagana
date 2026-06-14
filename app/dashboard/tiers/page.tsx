import { redirect } from "next/navigation";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
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

function statusClass(status: string) {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-900";
  if (status === "PENDING") return "bg-amber-100 text-amber-900";
  if (status === "PAID") return "bg-emerald-100 text-emerald-900";
  if (status === "EXPIRED" || status === "FAILED") return "bg-red-100 text-red-900";
  if (status === "CANCELED" || status === "REFUNDED") return "bg-gray-100 text-gray-700";
  return "bg-slate-100 text-slate-800";
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
    <section className="space-y-5">
      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}

      <div>
        <h1 className="text-2xl font-semibold">Memberships</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Manage membership tiers, enroll contacts as formal members, and record membership payments before public
          checkout is opened.
        </p>
      </div>

      {!adminData.ok && <p className="text-sm text-red-700">{adminData.error}</p>}
      {params.error && <p className="text-sm text-red-700">{params.error}</p>}
      {params.success === "tier" && <SuccessMessage>Membership tier saved.</SuccessMessage>}
      {params.success === "enrolled" && <SuccessMessage>Member enrolled.</SuccessMessage>}
      {params.success === "payment" && <SuccessMessage>Payment recorded.</SuccessMessage>}
      {params.success === "status" && <SuccessMessage>Membership status updated.</SuccessMessage>}

      {data && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Active members" value={data.summary.activeMemberships} />
            <Metric label="Expiring in 30d" value={data.summary.expiringSoon} />
            <Metric label="Expired/lapsed" value={data.summary.expired} />
            <Metric label="Collected" value={formatCents(data.summary.collectedCents)} />
            <Metric label="Pending" value={formatCents(data.summary.pendingCents)} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <h2 className="text-base font-semibold text-gray-900">Create a tier</h2>
              <form action={createTierAction} className="mt-4 grid gap-3">
                {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                <input
                  name="name"
                  required
                  placeholder="Tier name, e.g. Annual family"
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Description visible to admins for now"
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="amountDollars"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select name="interval" defaultValue="ANNUAL" className="rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="ANNUAL">Annual</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ONE_TIME">One-time</option>
                  </select>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input name="active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
                  Active for new enrollments
                </label>
                <button type="submit" className="w-fit rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
                  Save tier
                </button>
              </form>
            </div>

            <div className="rounded-md border border-gray-200 bg-white p-4">
              <h2 className="text-base font-semibold text-gray-900">Enroll a member</h2>
              <form action={enrollMembershipAction} className="mt-4 grid gap-3">
                {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                <div className="grid gap-3 md:grid-cols-2">
                  <select name="contactId" required className="rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Choose contact</option>
                    {data.contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.lastName}, {contact.firstName} - {contact.email}
                      </option>
                    ))}
                  </select>
                  <select name="tierId" required className="rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Choose tier</option>
                    {data.tiers
                      .filter((tier) => tier.active)
                      .map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name} - {formatCents(tier.amountCents)} / {tier.interval.toLowerCase()}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <select name="status" defaultValue="ACTIVE" className="rounded border border-gray-300 px-3 py-2 text-sm">
                    {MEMBERSHIP_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <input name="startsAt" required type="date" className="rounded border border-gray-300 px-3 py-2 text-sm" />
                  <input name="expiresAt" type="date" className="rounded border border-gray-300 px-3 py-2 text-sm" />
                  <label className="inline-flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-sm text-gray-700">
                    <input name="autoRenew" type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                    Auto-renew
                  </label>
                </div>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Membership notes"
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    name="initialPaymentDollars"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                    placeholder="Initial payment"
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select name="initialPaymentMethod" defaultValue="OFFLINE" className="rounded border border-gray-300 px-3 py-2 text-sm">
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <select name="initialPaymentStatus" defaultValue="PAID" className="rounded border border-gray-300 px-3 py-2 text-sm">
                    {PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <input name="initialPaymentPaidAt" type="date" className="rounded border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <input
                  name="initialPaymentNotes"
                  placeholder="Payment memo, check number, or receipt note"
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={data.contacts.length === 0 || data.tiers.filter((tier) => tier.active).length === 0}
                  className="w-fit rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Enroll member
                </button>
              </form>
            </div>
          </section>

          <section className="rounded-md border border-gray-200 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">Membership tiers</h2>
            {data.tiers.length === 0 ? (
              <EmptyState>Create your first membership tier before enrolling members.</EmptyState>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-4">Tier</th>
                      <th className="py-2 pr-4">Price</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tiers.map((tier) => (
                      <tr key={tier.id} className="border-b border-gray-100 align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">{tier.name}</p>
                          {tier.description && <p className="mt-1 max-w-xl text-xs text-gray-600">{tier.description}</p>}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {formatCents(tier.amountCents)} / {tier.interval.toLowerCase()}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${tier.active ? "bg-emerald-100 text-emerald-900" : "bg-gray-100 text-gray-700"}`}>
                            {tier.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{tier._count.memberships}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-md border border-gray-200 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">Member enrollments</h2>
            {data.memberships.length === 0 ? (
              <EmptyState>No formal memberships yet. Enroll a contact above to start the member ledger.</EmptyState>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-4">Member</th>
                      <th className="py-2 pr-4">Tier</th>
                      <th className="py-2 pr-4">Term</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Recent payments</th>
                      <th className="py-2 pr-4">Record payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.memberships.map((membership) => (
                      <tr key={membership.id} className="border-b border-gray-100 align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">
                            {membership.contact.firstName} {membership.contact.lastName}
                          </p>
                          <p className="text-gray-600">{membership.contact.email}</p>
                          <p className="text-xs text-gray-500">{membership.contact.phone ?? "No phone"}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">{membership.tier.name}</p>
                          <p className="text-xs text-gray-600">
                            {formatCents(membership.tier.amountCents)} / {membership.tier.interval.toLowerCase()}
                          </p>
                          {membership.autoRenew && <p className="mt-1 text-xs text-blue-700">Auto-renew</p>}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          <p>Starts {formatDate(membership.startsAt)}</p>
                          <p className="text-xs text-gray-500">
                            {membership.expiresAt ? `Expires ${formatDate(membership.expiresAt)}` : "No expiration"}
                          </p>
                          {membership.notes && <p className="mt-1 max-w-[220px] text-xs text-gray-500">{membership.notes}</p>}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusClass(membership.status)}`}>
                            {membership.status}
                          </span>
                          <form action={updateStatusAction} className="mt-2 grid gap-1">
                            {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                            <input type="hidden" name="membershipId" value={membership.id} />
                            <select name="status" defaultValue={membership.status} className="rounded border border-gray-300 px-2 py-1 text-xs">
                              {MEMBERSHIP_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className="rounded bg-gray-800 px-2 py-1 text-xs text-white">
                              Update
                            </button>
                          </form>
                        </td>
                        <td className="py-3 pr-4">
                          {membership.payments.length === 0 ? (
                            <p className="text-xs text-gray-500">No payments yet</p>
                          ) : (
                            <ul className="space-y-1">
                              {membership.payments.map((payment) => (
                                <li key={payment.id} className="text-xs text-gray-700">
                                  <span className="font-medium">{formatCents(payment.amountCents)}</span>
                                  {" · "}
                                  <span className={`rounded px-1.5 py-0.5 ${statusClass(payment.status)}`}>{payment.status}</span>
                                  {" · "}
                                  {payment.method.replace(/_/g, " ")}
                                  <p className="text-gray-500">
                                    {payment.paidAt ? formatRelativeTime(payment.paidAt) : formatRelativeTime(payment.createdAt)}
                                  </p>
                                  {payment.receipt && (
                                    <p className="font-mono text-[10px] text-gray-500">{payment.receipt.receiptNumber}</p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-3 pr-4 min-w-[220px]">
                          <details>
                            <summary className="cursor-pointer text-xs font-medium text-blue-700 underline">Add payment</summary>
                            <form action={recordPaymentAction} className="mt-2 grid gap-2 rounded border border-gray-200 bg-gray-50 p-2">
                              {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                              <input type="hidden" name="membershipId" value={membership.id} />
                              <input
                                name="amountDollars"
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Amount"
                                className="rounded border border-gray-300 px-2 py-1 text-xs"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <select name="method" defaultValue="OFFLINE" className="rounded border border-gray-300 px-2 py-1 text-xs">
                                  {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>
                                      {method.replace(/_/g, " ")}
                                    </option>
                                  ))}
                                </select>
                                <select name="status" defaultValue="PAID" className="rounded border border-gray-300 px-2 py-1 text-xs">
                                  {PAYMENT_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <input name="paidAt" type="date" className="rounded border border-gray-300 px-2 py-1 text-xs" />
                              <input
                                name="providerRef"
                                placeholder="Reference"
                                className="rounded border border-gray-300 px-2 py-1 text-xs"
                              />
                              <textarea
                                name="notes"
                                rows={2}
                                placeholder="Payment notes"
                                className="rounded border border-gray-300 px-2 py-1 text-xs"
                              />
                              <button type="submit" className="rounded bg-gray-800 px-2 py-1 text-xs text-white">
                                Record payment
                              </button>
                            </form>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-700">
      {children}
    </div>
  );
}

function SuccessMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      {children}
    </p>
  );
}
