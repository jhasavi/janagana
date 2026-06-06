import { redirect } from "next/navigation";
import { createPublicMembershipCheckout, listPublicMembershipTiers } from "@/lib/actions/public-memberships";
import { paymentFeeDisclosure } from "@/lib/payments/fee-policy";
import { formatCents } from "@/lib/utils";

function statusMessage(status?: string, error?: string) {
  if (error) return error;
  if (status === "processing") return "Payment received by Stripe. Your membership will activate as soon as confirmation arrives.";
  if (status === "joined") return "Membership activated. Your receipt has been recorded.";
  if (status === "canceled") return "Checkout was canceled. You can choose a membership and try again.";
  return null;
}

export default async function PublicMembershipJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const result = await listPublicMembershipTiers(tenantSlug);

  if (!result.ok || !result.tenant) {
    redirect(`/portal/${tenantSlug}`);
  }

  async function checkoutAction(formData: FormData) {
    "use server";

    const checkout = await createPublicMembershipCheckout({
      tenantSlug,
      tierId: String(formData.get("tierId") ?? ""),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });

    if (!checkout.ok || !checkout.checkoutUrl) {
      redirect(`/portal/${tenantSlug}/join?error=${encodeURIComponent(checkout.error ?? "Checkout failed")}`);
    }

    redirect(checkout.checkoutUrl);
  }

  const message = statusMessage(query.status, query.error);
  const defaultTierId = result.data[0]?.id ?? "";

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Membership</p>
        <h1 className="mt-2 text-3xl font-semibold">Join {result.tenant.name}</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Choose a membership and enter your details. Paid memberships continue to secure checkout.
        </p>
        <p className="mt-2 text-sm font-medium text-slate-700">{paymentFeeDisclosure()}</p>
        {message && <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-800">{message}</p>}
      </section>

      {result.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Memberships are not open online yet. Please check back soon.
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Available memberships</h2>
            {result.data.map((tier) => (
              <article key={tier.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">{tier.name}</h3>
                    {tier.description && <p className="mt-2 text-sm text-slate-600">{tier.description}</p>}
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-950">
                    {formatCents(tier.amountCents)}
                    <span className="block text-right text-xs font-normal text-slate-500">
                      {tier.interval.toLowerCase()}
                    </span>
                  </p>
                </div>
              </article>
            ))}
          </div>

          <form action={checkoutAction} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Member details</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Membership
                <select
                  name="tierId"
                  required
                  defaultValue={defaultTierId}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {result.data.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} - {formatCents(tier.amountCents)} / {tier.interval.toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  First name
                  <input name="firstName" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Last name
                  <input name="lastName" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Email
                <input type="email" name="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Phone
                <input name="phone" type="tel" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>

            <button type="submit" className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Continue
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
