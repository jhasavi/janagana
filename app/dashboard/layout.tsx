import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { getCurrentUser } from "@/lib/auth";
import { publicPortalUrl } from "@/lib/environment";
import { communityLabel } from "@/lib/pilot/portal-links";
import { resolveTenantForDashboard } from "@/lib/tenant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const resolution = await resolveTenantForDashboard();
  if (resolution.staleCookieIgnored) {
    redirect("/api/select-tenant?reason=stale-cookie");
  }
  if (resolution.status === "ZERO_TENANTS") {
    redirect("/onboarding/create-organization");
  }
  if (resolution.status === "MULTI_TENANT") {
    redirect("/select-organization");
  }

  const tenant = resolution.tenant;
  const portalUrl = publicPortalUrl(tenant.slug);
  const community = communityLabel(tenant.slug);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/dashboard" className="shrink-0 font-semibold text-gray-900 hover:text-black">
                JanaGana
              </Link>
              <span className="text-gray-300">|</span>
              <div className="min-w-0 truncate">
                <p className="truncate text-sm font-medium text-gray-900">{community}</p>
                <p className="truncate font-mono text-xs text-gray-500">{tenant.slug}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <CopyTextButton text={portalUrl} label="Copy portal" className="hidden sm:inline-flex" />
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
              >
                Portal ↗
              </a>
              <Link
                href="/api/select-tenant?reason=prepare-switch"
                className="text-xs font-medium text-blue-700 hover:underline"
              >
                Switch community
              </Link>
              <form action="/api/sign-out" method="POST">
                <button type="submit" className="text-xs text-gray-600 hover:underline">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="w-52 shrink-0">
            <DashboardNav />
            <div className="mt-6 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-600">
              <p className="font-medium text-gray-900">{community}</p>
              <p className="mt-1 font-mono text-[11px] text-gray-700">{tenant.slug}</p>
              <CopyTextButton text={portalUrl} label="Copy portal URL" className="mt-2 w-full text-[11px]" />
              <Link href="/dashboard/settings" className="mt-2 inline-block text-blue-700 underline">
                Website links
              </Link>
            </div>
          </aside>

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
