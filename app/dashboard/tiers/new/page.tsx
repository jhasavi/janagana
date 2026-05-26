"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMembershipTier } from "@/lib/actions";
import type { MembershipInterval } from "@prisma/client";

export default function NewTierPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const amountDollars = parseFloat(fd.get("amount") as string);

    const result = await createMembershipTier("__tenant_from_session__", {
      name: fd.get("name") as string,
      amountCents: Math.round(amountDollars * 100),
      interval: (fd.get("interval") as MembershipInterval) || "MONTHLY",
      stripePriceId: (fd.get("stripePriceId") as string) || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard/tiers");
  }

  return (
    <div>
      <div className="mb-6">
        <a href="/dashboard/tiers" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to tiers
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Add membership tier</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 max-w-lg">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tier name *</label>
          <input
            name="name"
            required
            placeholder="e.g., Monthly Membership"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD) *</label>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="19.99"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing interval *</label>
            <select
              name="interval"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
              <option value="ONE_TIME">One-time</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stripe Price ID{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            name="stripePriceId"
            placeholder="price_..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Add tier"}
          </button>
          <a href="/dashboard/tiers" className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
