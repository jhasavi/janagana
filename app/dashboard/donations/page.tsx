import Link from "next/link";
import { redirect } from "next/navigation";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { listDonationAdminData, recordOfflineDonation } from "@/lib/actions/donations";
import { publicPortalUrl } from "@/lib/environment";
import { readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";

const PAYMENT_METHODS = ["OFFLINE", "CASH", "CHECK", "CARD", "BANK_TRANSFER", "OTHER"] as const;

function centsFromDollars(value: FormDataEntryValue | null) {
  const dollars = Number(String(value ?? "0"));
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : NaN;
}

function statusClass(status: string) {
  if (status === "PAID") return "bg-emerald-100 text-emerald-900";
  if (status === "PENDING") return "bg-amber-100 text-amber-900";
  if (status === "FAILED") return "bg-red-100 text-red-900";
  return "bg-slate-100 text-slate-800";
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
      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">Community OS</p>
        <h1 className="text-2xl font-semibold text-slate-950">Donations</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Track gifts from supporters — online via the public donate page or offline entries recorded here. JanaGana
          platform fee is 0; Stripe processor fees are separate.
        </p>
        {portalUrl && (
          <p className="text-sm text-slate-700">
            Public donate page:{" "}
            <a href={`${portalUrl}/donate`} target="_blank" rel="noreferrer" className="font-semibold text-teal-900 hover:underline">
              {portalUrl}/donate
            </a>
          </p>
        )}
      </header>

      {params.error && <p className="text-sm text-red-700">{params.error}</p>}
      {params.success === "recorded" && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Donation recorded and receipt queued when applicable.
        </p>
      )}

      {data && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total received" value={formatCents(data.summary.totalReceivedCents)} />
            <SummaryCard label="Donations" value={String(data.summary.donationCount)} />
            <SummaryCard label="This month" value={formatCents(data.summary.thisMonthCents)} />
            <SummaryCard label="Pending online" value={String(data.summary.pendingCount)} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Record offline donation</h2>
              <p className="mt-1 text-sm text-slate-600">Cash, check, or bank transfer received outside Stripe.</p>
              <form action={recordDonationAction} className="mt-4 grid gap-3">
                {tenant && <TenantScopeHiddenFields tenantId={tenant.id} />}
                <select name="contactId" required className="rounded border border-stone-300 px-3 py-2 text-sm">
                  <option value="">Choose donor / contact</option>
                  {data.contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.lastName}, {contact.firstName} — {contact.email}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="amountDollars"
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Amount (USD)"
                    className="rounded border border-stone-300 px-3 py-2 text-sm"
                  />
                  <select name="method" defaultValue="CHECK" className="rounded border border-stone-300 px-3 py-2 text-sm">
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <input name="paidAt" type="date" className="rounded border border-stone-300 px-3 py-2 text-sm" />
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Check number, campaign, or thank-you note"
                  className="rounded border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={data.contacts.length === 0}
                  className="w-fit rounded bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  Record donation
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-700">
              <p className="font-medium text-slate-950">Share the donate page</p>
              <p className="mt-2">Add a &ldquo;Donate&rdquo; button on your community website linking to the portal donate URL.</p>
              {portalUrl && (
                <p className="mt-2 break-all font-mono text-xs text-teal-900">{portalUrl}/donate</p>
              )}
              <Link href="/dashboard/settings" className="mt-3 inline-block font-semibold text-teal-900 hover:text-slate-950">
                Portal links in settings →
              </Link>
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">Donation history</h2>
            </div>
            {data.donations.length === 0 ? (
              <div className="border-t border-dashed border-stone-200 bg-stone-50 p-6 text-sm text-slate-700">
                <p className="font-medium text-slate-950">No donations recorded yet</p>
                <p className="mt-2">Share the public donate page or record an offline gift above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">When</th>
                      <th className="px-5 py-3">Donor</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.donations.map((donation) => (
                      <tr key={donation.id} className="border-b border-stone-100">
                        <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                          <span title={formatDate(donation.paidAt ?? donation.createdAt)}>
                            {formatRelativeTime(donation.paidAt ?? donation.createdAt)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {donation.contact ? (
                            <>
                              <Link
                                href={`/dashboard/members/${donation.contact.id}`}
                                className="font-medium text-teal-900 hover:text-slate-950"
                              >
                                {donation.contact.firstName} {donation.contact.lastName}
                              </Link>
                              <p className="text-slate-600">{donation.contact.email}</p>
                            </>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-medium">{formatCents(donation.amountCents)}</td>
                        <td className="px-5 py-3 text-slate-600">{donation.method.replace(/_/g, " ")}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass(donation.status)}`}>
                            {donation.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-600">{donation.receiptNumber ?? "—"}</td>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
