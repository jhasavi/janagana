import { redirect } from "next/navigation";
import { formatCents } from "@/lib/utils";
import { createMembershipTier, listMembershipTiers } from "@/lib/actions/membership-tiers";

export default async function TiersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  async function createTierAction(formData: FormData) {
    "use server";

    const amountDollarsRaw = String(formData.get("amountDollars") ?? "").trim();
    const amountDollars = Number(amountDollarsRaw);
    const amountCents = Number.isFinite(amountDollars) ? Math.round(amountDollars * 100) : NaN;

    const result = await createMembershipTier({
      name: String(formData.get("name") ?? ""),
      amountCents,
      interval: String(formData.get("interval") ?? "MONTHLY"),
      active: String(formData.get("active") ?? "") === "on",
    });

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to create tier";
      redirect(`/dashboard/tiers?error=${encodeURIComponent(errorMessage)}`);
    }

    redirect("/dashboard/tiers?success=1");
  }

  const tiersResult = await listMembershipTiers();
  const tiers = tiersResult.ok ? tiersResult.data : [];

  return (
    <section>
      <h1 className="text-2xl font-semibold">Membership tiers</h1>
      <p className="mt-2 text-sm text-gray-600">Create and view tenant-scoped membership tiers.</p>

      {params.error && <p className="mt-4 text-sm text-red-700">{params.error}</p>}
      {params.success && <p className="mt-4 text-sm text-green-700">Tier created.</p>}

      <form action={createTierAction} className="mt-6 grid gap-3 rounded-md border border-gray-200 bg-white p-4 md:grid-cols-2">
        <input name="name" required placeholder="Tier name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input
          name="amountDollars"
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount (USD)"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <select name="interval" defaultValue="MONTHLY" className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="MONTHLY">MONTHLY</option>
          <option value="ANNUAL">ANNUAL</option>
          <option value="ONE_TIME">ONE_TIME</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="active" defaultChecked />
          Active
        </label>
        <div className="md:col-span-2">
          <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
            Create tier
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        {tiers.length === 0 ? (
          <p className="text-sm text-gray-500">No membership tiers yet for this tenant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Interval</th>
                  <th className="py-2 pr-4">Active</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{tier.name}</td>
                    <td className="py-2 pr-4">{formatCents(tier.amountCents)}</td>
                    <td className="py-2 pr-4">{tier.interval}</td>
                    <td className="py-2 pr-4">{tier.active ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
