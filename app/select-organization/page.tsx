import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { getCurrentUser } from "@/lib/auth";
import { communityLabel } from "@/lib/pilot/portal-links";
import { selfServeOnboardingEnabled } from "@/lib/pilot/dashboard-nav";
import { findMappedTenantsForUser } from "@/lib/tenant";
import { publicPortalUrl } from "@/lib/environment";

// Tenant selection uses POST /api/select-tenant (reliable cookie write). GET prepare-switch clears cookie first.

export default async function SelectOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; switch?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const tenants = await findMappedTenantsForUser();

  if (tenants.length === 0) {
    redirect("/onboarding/create-organization");
  }

  const params = await searchParams;
  const explicitSwitch = params.switch === "1";

  if (tenants.length === 1 && !params.error && !explicitSwitch) {
    redirect("/api/select-tenant?reason=auto-single");
  }

  const selfServeEnabled = selfServeOnboardingEnabled();

  function tenantSelectionErrorMessage(error?: string) {
    switch (error) {
      case "missing-tenant":
        return "Please choose an organization to continue.";
      case "invalid-tenant":
        return "The selected organization is not valid. Choose an organization from the list.";
      case "invalid-request":
        return "Invalid request. Please select an organization from the list.";
      default:
        return "Unable to select that organization. Please try again.";
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Switch community</h1>
      <p className="mt-2 text-sm text-gray-600">
        You have access to {tenants.length} communit{tenants.length === 1 ? "y" : "ies"}. Choose which one to open —
        contacts, events, and portal data are separate. Signed in as {user.email ?? user.name ?? user.id}
      </p>
      <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Double-check the community name before continuing. Wrong selection shows another org&apos;s leads and
        registrations.
      </p>

      {tenants.length === 1 && (
        <p className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-950">
          Your Clerk account is mapped to one community only ({communityLabel(tenants[0].slug)}). To operate both Namaste
          Boston and The Purple Wings, an admin must add you to both Clerk organizations.
        </p>
      )}

      {params.error && (
        <p className="mt-4 text-sm text-red-700">{tenantSelectionErrorMessage(params.error)}</p>
      )}

      <div className="mt-6 space-y-3">
        {tenants.map((tenant) => {
          const portalUrl = publicPortalUrl(tenant.slug);
          return (
            <form
              key={tenant.id}
              action="/api/select-tenant"
              method="POST"
              className="rounded-md border border-gray-200 bg-white p-4"
            >
              <input type="hidden" name="tenantId" value={tenant.id} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{communityLabel(tenant.slug)}</h2>
                  <p className="text-sm text-gray-600">{tenant.name}</p>
                  <p className="mt-1 font-mono text-xs text-gray-500">{tenant.slug}</p>
                  <p className="mt-2 break-all font-mono text-xs text-blue-800">{portalUrl}</p>
                  <CopyTextButton text={portalUrl} label="Copy portal" className="mt-2" />
                </div>
                <button
                  type="submit"
                  className="shrink-0 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Open {communityLabel(tenant.slug)}
                </button>
              </div>
            </form>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-4">
        {selfServeEnabled ? (
          <Link href="/onboarding/create-organization" className="text-sm text-blue-700 underline">
            New community setup (admin only)
          </Link>
        ) : (
          <p className="text-sm text-gray-600">
            New community setup is disabled for the pilot. Contact your administrator for access.
          </p>
        )}
        <Link href="/dashboard" className="text-sm text-gray-700 underline">
          Back to dashboard
        </Link>
        <form action="/api/sign-out" method="POST">
          <button type="submit" className="text-sm text-gray-700 underline">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
