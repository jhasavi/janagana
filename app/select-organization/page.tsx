import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { clearActiveTenantCookies, findMappedTenantsForUser, setActiveTenantCookie } from "@/lib/tenant";
import { createRequestId } from "@/lib/utils";

// NOTE: Cookies cannot be set during server-component render (Next.js 15).
// Single-tenant auto-select delegates to /api/select-tenant (a Route Handler).
// Multi-tenant selection uses chooseTenantAction (a Server Action) — both are valid cookie contexts.

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
  const hasSingleTenant = tenants.length === 1;

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
      <h1 className="text-2xl font-semibold">Select organization</h1>
      <p className="mt-2 text-sm text-gray-600">
        Signed in as {user.email ?? user.name ?? user.id}
      </p>

      {params.error && (
        <p className="mt-4 text-sm text-red-700">Unable to select that organization. Please try again.</p>
      )}

      {hasSingleTenant && (
        <p className="mt-4 text-sm text-gray-700">
          You currently have one organization. Continue to dashboard or create another organization.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {tenants.map((tenant) => (
          <form key={tenant.id} action={chooseTenantAction} className="rounded-md border border-gray-200 p-4 bg-white">
            <input type="hidden" name="tenantId" value={tenant.id} />
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-medium text-gray-900">{tenant.name}</h2>
                <p className="text-sm text-gray-500">/{tenant.slug}</p>
              </div>
              <button
                type="submit"
                className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
              >
                {hasSingleTenant ? "Continue to dashboard" : "Continue"}
              </button>
            </div>
          </form>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Link href="/onboarding/create-organization" className="text-sm text-blue-700 underline">
          Create another organization
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
