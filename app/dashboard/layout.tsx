import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, LogOut, Shuffle } from "lucide-react";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { getCurrentUser } from "@/lib/auth";
import { publicPortalUrl } from "@/lib/environment";
import { communityLabel } from "@/lib/pilot/portal-links";
import { getVisibleCommunityOsNav } from "@/lib/pilot/dashboard-nav";
import { findMappedTenantsForUser, resolveTenantForDashboard } from "@/lib/tenant";
import { redirectForZeroTenantAccess } from "@/lib/tenant/onboarding-redirect";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const [resolution, mappedTenants] = await Promise.all([
    resolveTenantForDashboard(),
    findMappedTenantsForUser(),
  ]);
  const canSwitchCommunity = mappedTenants.length > 1;

  if (resolution.staleCookieIgnored) {
    redirect("/api/select-tenant?reason=stale-cookie");
  }
  if (resolution.status === "ZERO_TENANTS") {
    return redirectForZeroTenantAccess();
  }
  if (resolution.status === "MULTI_TENANT") {
    redirect("/select-organization");
  }

  const tenant = resolution.tenant;
  const portalUrl = publicPortalUrl(tenant.slug);
  const community = communityLabel(tenant.slug);

  return (
    <div className="min-h-screen bg-[#f7f3ec]">
      <nav className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/dashboard" className="shrink-0 text-lg font-semibold text-slate-950 hover:text-teal-900">
                JanaGana <span className="font-normal text-slate-500">Lite</span>
              </Link>
              <span className="hidden h-6 w-px bg-stone-200 sm:block" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{community}</p>
                <p className="truncate font-mono text-xs text-slate-500">{tenant.slug}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CopyTextButton text={portalUrl} label="Copy portal" className="hidden sm:inline-flex" />
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-900"
              >
                Portal
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {canSwitchCommunity && (
                <Link
                  href="/api/select-tenant?reason=prepare-switch"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100 hover:text-slate-950"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Switch community
                </Link>
              )}
              <form action="/api/sign-out" method="POST">
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium text-slate-600 hover:bg-stone-100 hover:text-slate-950">
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <DashboardNav groups={getVisibleCommunityOsNav()} />
            <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
              <p className="font-semibold text-slate-950">{community}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-700">{tenant.slug}</p>
              <CopyTextButton text={portalUrl} label="Copy portal URL" className="mt-2 w-full text-[11px]" />
              <Link href="/dashboard/settings" className="mt-3 inline-block font-semibold text-teal-900 hover:text-slate-950">
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
