import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, HeartHandshake } from "lucide-react";
import {
  DONATION_PRESET_CENTS,
  getPublicDonationContext,
} from "@/lib/actions/public-donations";
import { paymentFeeDisclosure } from "@/lib/payments/fee-policy";
import {
  defaultVisitorReturnUrl,
  readSafeReturnUrl,
  visitorReturnUrlWithStatus,
} from "@/lib/portal/safe-return-url";
import { formatCents } from "@/lib/utils";

const RETURN_TO_FIELD = "returnTo";

function statusMessage(status?: string, error?: string) {
  if (error) return error;
  if (status === "thankyou") {
    return "Thank you for your gift. Your donation is being confirmed — a receipt will be recorded for the organizer.";
  }
  if (status === "canceled") return "Checkout was canceled. You can try again anytime.";
  return null;
}

export default async function PublicDonatePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ status?: string; error?: string; returnTo?: string }>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const ctx = await getPublicDonationContext(tenantSlug);

  if (!ctx.ok || !ctx.tenant) {
    redirect(`/portal/${tenantSlug}`);
  }

  const safeReturnTo = readSafeReturnUrl(query.returnTo);
  const backUrl = safeReturnTo ?? defaultVisitorReturnUrl(tenantSlug);
  const message = statusMessage(query.status, query.error);

  return (
    <main className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-stone-200 bg-teal-950 p-6 text-white shadow-sm sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-teal-50">
          <HeartHandshake className="h-5 w-5" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-teal-100">Support</p>
        <h1 className="mt-2 text-3xl font-semibold">Donate to {ctx.tenant.name}</h1>
        <p className="mt-4 text-sm leading-6 text-teal-100">
          Your gift helps this volunteer-run community continue programs, events, and outreach. JanaGana does not charge a
          platform fee on donations.
        </p>
        <p className="mt-4 text-sm text-teal-50">{paymentFeeDisclosure()}</p>
        {backUrl && (
          <a href={backUrl} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-teal-100">
            <ArrowLeft className="h-4 w-4" />
            Community website
          </a>
        )}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        {message && (
          <p className="rounded-md bg-teal-50 px-4 py-3 text-sm text-teal-950">{message}</p>
        )}

        {query.status === "thankyou" && backUrl && (
          <p className="mt-3">
            <a
              href={visitorReturnUrlWithStatus(backUrl, "donation", "thankyou")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal-900 hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to community website
            </a>
          </p>
        )}

        {!ctx.stripeEnabled && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Online donations are not open yet. Please contact the organization directly.
          </div>
        )}

        {query.status !== "thankyou" && ctx.stripeEnabled && (
          <form action="/api/public/donate" method="post" className="mt-4 space-y-4">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            {safeReturnTo ? <input type="hidden" name={RETURN_TO_FIELD} value={safeReturnTo} /> : null}

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Gift amount</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DONATION_PRESET_CENTS.map((cents) => (
                  <label
                    key={cents}
                    className="flex cursor-pointer items-center justify-center rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-slate-800 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50"
                  >
                    <input type="radio" name="amountPreset" value={cents} defaultChecked={cents === 5000} className="sr-only" />
                    {formatCents(cents)}
                  </label>
                ))}
                <label className="flex cursor-pointer items-center justify-center rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-slate-800 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50 sm:col-span-1">
                  <input type="radio" name="amountPreset" value="custom" className="sr-only" />
                  Other
                </label>
              </div>
              <label className="mt-3 block text-sm text-slate-600">
                Custom amount (USD)
                <input
                  name="customAmountDollars"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 75"
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                First name
                <input name="firstName" required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Last name
                <input name="lastName" required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input type="email" name="email" required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Phone (optional)
              <input name="phone" type="tel" className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Dedication or note (optional)
              <textarea name="dedication" rows={3} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
            >
              Continue to secure checkout
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-slate-500">
          No login required — this page is public for donors and visitors.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Portal URL for your website:{" "}
          <Link href={`/portal/${tenantSlug}/donate`} className="font-mono text-teal-900 hover:underline">
            /portal/{tenantSlug}/donate
          </Link>
        </p>
      </section>
    </main>
  );
}
