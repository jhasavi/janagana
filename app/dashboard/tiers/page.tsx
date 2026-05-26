import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTenantByClerkOrgId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

export default async function TiersPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const tenant = await getTenantByClerkOrgId(orgId);
  if (!tenant) redirect("/onboarding/create-organization");

  const tiers = await prisma.membershipTier.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Membership Tiers</h1>
        <Link
          href="/dashboard/tiers/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add tier
        </Link>
      </div>

      {tiers.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No membership tiers yet.</p>
          <Link
            href="/dashboard/tiers/new"
            className="text-sm text-blue-600 hover:underline mt-2 inline-block"
          >
            Create your first tier
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tiers.map((tier) => (
            <div key={tier.id} className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{tier.name}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCents(tier.amountCents)}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      /{tier.interval.toLowerCase()}
                    </span>
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    tier.active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tier.active ? "Active" : "Inactive"}
                </span>
              </div>
              {tier.stripePriceId && (
                <p className="text-xs text-gray-400 mt-2">
                  Stripe: {tier.stripePriceId}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
