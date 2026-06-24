import Link from "next/link";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { getTenantFinancialSummary } from "@/lib/dashboard/financial-summary";
import { resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate, formatRelativeTime } from "@/lib/utils";

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

function statusClass(status: string) {
  if (status === "PAID") return "bg-emerald-100 text-emerald-900";
  if (status === "PENDING") return "bg-amber-100 text-amber-900";
  if (status === "FAILED") return "bg-red-100 text-red-900";
  if (status === "REFUNDED") return "bg-gray-100 text-gray-700";
  return "bg-slate-100 text-slate-800";
}

export default async function PaymentsPage() {
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const financial = tenant ? await getTenantFinancialSummary(tenant.id) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">Community OS</p>
        <h1 className="text-2xl font-semibold text-slate-950">Payments</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Membership dues, event fees, and donations recorded for this community. JanaGana platform fee is 0 — processor
          fees are separate.
        </p>
      </header>

      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}

      {financial && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total received" value={formatCents(financial.totalRevenueCents)} />
          <SummaryCard label="Membership" value={formatCents(financial.membershipRevenueCents)} detail={`${financial.membershipPaymentCount} payments`} />
          <SummaryCard label="Events" value={formatCents(financial.eventRevenueCents)} detail={`${financial.eventPaymentCount} payments`} />
          <SummaryCard label="Donations" value={formatCents(financial.donationRevenueCents)} detail={`${financial.donationPaymentCount} payments`} />
        </div>
      )}

      <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-stone-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Recent payments</h2>
            <p className="mt-0.5 text-sm text-slate-600">Latest transactions across memberships, events, and donations.</p>
          </div>
          <Link href="/dashboard/tiers" className="shrink-0 text-sm font-semibold text-teal-900 hover:text-slate-950">
            Record membership payment
          </Link>
        </div>

        {!financial || financial.recentPayments.length === 0 ? (
          <div className="border-t border-dashed border-stone-200 bg-stone-50 p-6 text-sm text-slate-700">
            <p className="font-medium text-slate-950">No payments recorded yet</p>
            <p className="mt-2">
              Record offline dues on{" "}
              <Link href="/dashboard/tiers" className="font-semibold text-teal-900 hover:text-slate-950">
                Memberships
              </Link>{" "}
              or wait for Stripe checkout to complete.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Person</th>
                  <th className="px-5 py-3">Purpose</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {financial.recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-stone-100">
                    <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                      <span title={formatDate(payment.paidAt ?? payment.createdAt)}>
                        {formatRelativeTime(payment.paidAt ?? payment.createdAt)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {payment.contact ? (
                        <>
                          <p className="font-medium text-slate-950">
                            {payment.contact.firstName} {payment.contact.lastName}
                          </p>
                          <p className="text-slate-600">{payment.contact.email}</p>
                        </>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{purposeLabel(payment.purpose)}</td>
                    <td className="px-5 py-3 font-medium text-slate-950">{formatCents(payment.amountCents)}</td>
                    <td className="px-5 py-3 text-slate-600">{payment.method}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusClass(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}
