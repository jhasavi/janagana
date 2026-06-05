import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { tenantMappingStatusLabel, tenantStatusLabel } from "@/lib/tenant/mapping-labels";
import { selfServeOnboardingEnabled } from "@/lib/pilot/dashboard-nav";
import { clearActiveTenantCookies, findMappedTenantsForUser, setActiveTenantCookie } from "@/lib/tenant";
import { publicPortalUrl } from "@/lib/environment";
import { createRequestId } from "@/lib/utils";

// NOTE: Cookies cannot be set during server-component render (Next.js 15).
// Tenant selection uses chooseTenantAction (server action). POST /api/select-tenant is an alternate API path.

export default async function SelectOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
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

  if (tenants.length === 1 && !params.error) {
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

  async function chooseTenantAction(formData: FormData) {
    "use server";
    const requestId = createRequestId();

    const tenantId = String(formData.get("tenantId") ?? "").trim();
    const mappedTenants = await findMappedTenantsForUser();
    const selected = mappedTenants.find((tenant) => tenant.id === tenantId);

    if (!selected) {
      console.info("DASHBOARD_TENANT_FAILED", { reason: "INVALID_SELECTED_TENANT", requestId, tenantId });
      redirect("/select-organization?error=invalid-tenant");
    }

    await clearActiveTenantCookies();
    await setActiveTenantCookie(selected.id);
    console.info("SET_ACTIVE_TENANT", { requestId, tenantId: selected.id, source: "select-organization" });
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Select community</h1>
      <p className="mt-2 text-sm text-gray-600">
        You belong to more than one JanaGana community. Choose which tenant (database record) to operate.
        Signed in as {user.email ?? user.name ?? user.id}
      </p>

      {params.error && (
        <p className="mt-4 text-sm text-red-700">{tenantSelectionErrorMessage(params.error)}</p>
      )}

      <div className="mt-6 space-y-3">
        {tenants.map((tenant) => {
          const portalUrl = publicPortalUrl(tenant.slug);
          const mappingStatus = tenantMappingStatusLabel({
            tenantStatus: tenant.status,
            hasClerkMembership: true,
          });
          return (
            <form key={tenant.id} action={chooseTenantAction} className="rounded-md border border-gray-200 p-4 bg-white">
              <input type="hidden" name="tenantId" value={tenant.id} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-medium text-gray-900">{tenant.name}</h2>
                  <p className="text-sm text-gray-500">Tenant slug: <span className="font-mono">{tenant.slug}</span></p>
                  <p className="text-sm text-gray-500">Portal: <span className="font-mono break-all">{portalUrl}</span></p>
                  <p className="text-sm text-gray-500">
                    Tenant status: {tenantStatusLabel(tenant.status)} · {mappingStatus}
                  </p>
                  <p className="text-sm text-gray-500">Clerk org ID: <span className="font-mono break-all">{tenant.clerkOrgId}</span></p>
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
                >
                  Open dashboard
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
        <form action="/api/sign-out" method="POST">
          <button type="submit" className="text-sm text-gray-700 underline">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
