import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { communityLabel } from "@/lib/pilot/portal-links";
import { selfServeOnboardingEnabled } from "@/lib/pilot/dashboard-nav";
import { findMappedTenantsForUser } from "@/lib/tenant";
import { publicPortalUrl } from "@/lib/environment";

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

  if (tenants.length === 1) {
    redirect("/dashboard");
  }

  const selfServeEnabled = selfServeOnboardingEnabled();

  function tenantSelectionErrorMessage(error?: string) {
    switch (error) {
      case "missing-tenant":
        return "Please choose a community to continue.";
      case "invalid-tenant":
        return "That community is not available. Choose from the list below.";
      case "invalid-request":
        return "Invalid request. Please select a community from the list.";
      default:
        return "Unable to open that community. Please try again.";
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="jg-eyebrow">Multi-community login</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Choose a community</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        You have access to {tenants.length} communities. Pick one to open — contacts, events, and payments stay
        completely separate between them. Signed in as{" "}
        <span className="font-semibold text-foreground">{user.email ?? user.name ?? user.id}</span>.
      </p>

      {params.error && (
        <div className="mt-4">
          <Alert variant="error">{tenantSelectionErrorMessage(params.error)}</Alert>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {tenants.map((tenant) => {
          const portalUrl = publicPortalUrl(tenant.slug);
          return (
            <form key={tenant.id} action="/api/select-tenant" method="POST" className="jg-card p-5">
              <input type="hidden" name="tenantId" value={tenant.id} />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                    {tenant.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-foreground">{communityLabel(tenant.slug)}</h2>
                    <p className="truncate text-sm text-muted-foreground">{tenant.name}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <p className="truncate font-mono text-xs text-primary">{portalUrl}</p>
                      <CopyTextButton text={portalUrl} label="Copy" />
                    </div>
                  </div>
                </div>
                <Button type="submit" size="sm" className="shrink-0">
                  Open {communityLabel(tenant.slug)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
        {selfServeEnabled ? (
          <Link href="/onboarding/create-organization" className="font-semibold text-primary hover:text-foreground">
            New community setup (admin only)
          </Link>
        ) : null}
        <Link href="/dashboard" className="font-semibold text-muted-foreground hover:text-foreground">
          Back to dashboard
        </Link>
        <form action="/api/sign-out" method="POST">
          <button type="submit" className="font-semibold text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
