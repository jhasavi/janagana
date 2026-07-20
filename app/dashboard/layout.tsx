import { redirect } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DashboardWorkflowNav } from "@/components/dashboard/dashboard-workflow-nav";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { getCurrentUser, getDashboardAccessForTenant } from "@/lib/auth";
import { publicPortalUrl } from "@/lib/environment";
import { getVisibleCommunityOsNav, selfServeOnboardingEnabled } from "@/lib/pilot/dashboard-nav";
import { communityLabel } from "@/lib/pilot/portal-links";
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
  const switcherTenants = mappedTenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    label: communityLabel(t.slug),
  }));
  const canCreateOrg = selfServeOnboardingEnabled();

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
  const navGroups = getVisibleCommunityOsNav();
  const access = await getDashboardAccessForTenant(tenant);

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border/80 bg-card px-3 py-4 lg:flex">
        <div className="mb-2 shrink-0">
          <OrgSwitcher
            tenants={switcherTenants}
            currentTenantId={tenant.id}
            currentLabel={community}
            canCreateNew={canCreateOrg}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          <DashboardNav groups={navGroups} />
        </div>

        <div className="shrink-0 space-y-1 border-t border-border/80 pt-3">
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="jg-nav-link justify-between bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <span className="flex items-center gap-2.5">
              <ExternalLink className="h-4 w-4 shrink-0" />
              Member portal
            </span>
          </a>
          <form action="/api/sign-out" method="POST">
            <button type="submit" className="jg-nav-link w-full text-left">
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-50 border-b border-border/80 bg-card/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="min-w-0 flex-1 lg:hidden">
              <OrgSwitcher
                tenants={switcherTenants}
                currentTenantId={tenant.id}
                currentLabel={community}
                canCreateNew={canCreateOrg}
                compact
              />
            </div>
            <div className="hidden text-sm font-semibold text-muted-foreground lg:block">Operator workspace</div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <CopyTextButton text={portalUrl} label="Copy portal" className="hidden sm:inline-flex" />
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent/90 lg:hidden"
              >
                Member portal
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <form action="/api/sign-out" method="POST" className="lg:hidden">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
          {/* Mobile nav — sidebar is desktop-only */}
          <div className="lg:hidden">
            <DashboardWorkflowNav />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {!access.canWrite && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <span className="font-semibold">View-only ({access.roleLabel}).</span> You can browse the command center but
              cannot import contacts, edit records, or take payments actions. Ask an org admin to upgrade your Clerk role.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
