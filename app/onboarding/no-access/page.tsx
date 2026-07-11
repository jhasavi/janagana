import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
import { clerkOrgRoleLabel } from "@/lib/auth/clerk-roles";
import { communityLabel } from "@/lib/pilot/tenants";
import { PILOT_TENANT_SLUGS } from "@/lib/pilot/tenants";
import { findMappedTenantsForUser } from "@/lib/tenant";
import { isLocalClerkMode } from "@/lib/tenant/onboarding-redirect";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

function shortId(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default async function NoAccessPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const [mappedTenants, clerkOrgs] = await Promise.all([
    findMappedTenantsForUser(),
    getUserClerkOrganizations(),
  ]);

  if (mappedTenants.length > 0) {
    redirect(mappedTenants.length > 1 ? "/select-organization" : "/dashboard");
  }

  const mappedIds = new Set(mappedTenants.map((t) => t.clerkOrgId));
  const unmappedOrgs = clerkOrgs.filter((org) => !mappedIds.has(org.clerkOrgId));
  const pilotNames = PILOT_TENANT_SLUGS.map((slug) => communityLabel(slug)).join(" and ");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="jg-eyebrow">Access</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">No operator access yet</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Signed in as <strong className="text-foreground">{user.email ?? user.name ?? user.id}</strong>. The production
        pilot only includes <strong className="text-foreground">{pilotNames}</strong>. Your Clerk organization must be
        mapped in JanaGana before the dashboard opens.
      </p>

      {unmappedOrgs.length > 0 && (
        <Card className="mt-6 border-amber-200/80 bg-amber-50/50">
          <CardBody>
            <p className="font-medium text-foreground">Clerk organizations on your account (not connected)</p>
            <ul className="mt-3 space-y-2">
              {unmappedOrgs.map((org) => (
                <li key={org.clerkOrgId} className="rounded-xl border border-border/70 bg-card px-3 py-2">
                  <p className="font-medium text-foreground">{org.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Role: {clerkOrgRoleLabel(org.role)} · Clerk org ID:{" "}
                    <span className="font-mono">{shortId(org.clerkOrgId)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {isLocalClerkMode() && (
        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardBody>
            <p className="font-medium text-foreground">Local development note</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You are using <strong>Clerk test</strong> keys. Localhost only works when your test Clerk org IDs match the{" "}
              <span className="font-mono">Tenant.clerkOrgId</span> rows in your dev database.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Run <span className="font-mono">npm run seed:local-clerk</span> after setting org IDs in{" "}
              <span className="font-mono">.env.local</span>, or sign in on production with your pilot operator account.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="https://janagana.namasteneedham.com/sign-in">Open production sign-in</ButtonLink>
        <form action="/api/sign-out" method="POST">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted/60"
          >
            Sign out
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Need access? Ask your administrator to add you to Namaste Boston or The Purple Wings in Clerk, then map the org in
        JanaGana.
      </p>
    </main>
  );
}
