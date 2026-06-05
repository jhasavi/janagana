import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { getCurrentUser } from "@/lib/auth";
import { publicPortalUrl } from "@/lib/environment";
import { communityLabel } from "@/lib/pilot/portal-links";
import { PILOT_DASHBOARD_NAV } from "@/lib/pilot/dashboard-nav";
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
                <p className="truncate text-sm font-medium text-gray-900">{communityLabel(tenant.slug)}</p>
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
              <Link href="/select-organization" className="hidden text-xs text-blue-600 hover:underline md:inline">
                Switch
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
            <nav className="space-y-1">
              {PILOT_DASHBOARD_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-600">
              <p className="font-medium text-gray-900">Active tenant</p>
              <p className="mt-1 font-mono text-gray-800">{tenant.slug}</p>
              <p className="mt-2 line-clamp-2 break-all text-[10px] leading-snug text-gray-500">{portalUrl}</p>
              <Link href="/dashboard/settings" className="mt-2 inline-block text-blue-700 underline">
                Mapping
              </Link>
            </div>
            <p className="mt-4 px-1 text-[10px] leading-snug text-gray-400">
              Pilot only: portal leads, contacts, events, registrations.
            </p>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
