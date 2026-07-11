import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { TenantScopeHiddenFields } from "@/components/dashboard/tenant-scope-hidden-fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
import { clerkOrgRoleLabel } from "@/lib/auth/clerk-roles";
import { getTenantDashboardSummary } from "@/lib/dashboard/tenant-summary";
import { configuredAppUrl, currentClerkMode, keyModeFromPrefix, publicPortalUrl } from "@/lib/environment";
import { paymentFeeDisclosure } from "@/lib/payments/fee-policy";
import { communityLabel, portalLinksForTenant } from "@/lib/pilot/portal-links";
import { portalEmbedUrl } from "@/lib/pilot/tenant-integration";
import { selfServeOnboardingEnabled } from "@/lib/pilot/dashboard-nav";
import { tenantMappingStatusLabel, tenantStatusLabel } from "@/lib/tenant/mapping-labels";
import { findMappedTenantsForUser, readTenantIdHintFromForm, redirectWithActiveTenant, resolveTenantForDashboard } from "@/lib/tenant";
import { getTenantBranding, updateTenantBranding } from "@/lib/actions/tenant-branding";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const [resolution, clerkOrgs, mappedTenants] = await Promise.all([
    resolveTenantForDashboard(),
    getUserClerkOrganizations(),
    findMappedTenantsForUser(),
  ]);

  const mappedIds = new Set(mappedTenants.map((t) => t.clerkOrgId));
  const unmappedOrgs = clerkOrgs.filter((org) => !mappedIds.has(org.clerkOrgId));
  const activeTenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const activeClerkOrg = activeTenant
    ? clerkOrgs.find((org) => org.clerkOrgId === activeTenant.clerkOrgId) ?? null
    : null;
  const portalUrl = activeTenant ? publicPortalUrl(activeTenant.slug) : null;
  const summary = activeTenant ? await getTenantDashboardSummary(activeTenant.id) : null;
  const branding = activeTenant ? await getTenantBranding(activeTenant.id) : null;
  const tenantLinks = activeTenant ? portalLinksForTenant(activeTenant.slug) : [];
  const canSwitchCommunity = mappedTenants.length > 1;

  async function updateBrandingAction(formData: FormData) {
    "use server";
    const tenantHint = readTenantIdHintFromForm(formData);
    const result = await updateTenantBranding(
      {
        publicTagline: String(formData.get("publicTagline") ?? ""),
        publicContactEmail: String(formData.get("publicContactEmail") ?? ""),
        publicContactPhone: String(formData.get("publicContactPhone") ?? ""),
        logoUrl: String(formData.get("logoUrl") ?? ""),
      },
      { tenantIdHint: tenantHint }
    );
    if (!result.ok) {
      if (tenantHint) {
        redirectWithActiveTenant(tenantHint, `/dashboard/settings?error=${encodeURIComponent(result.error)}`);
      }
      redirect(`/dashboard/settings?error=${encodeURIComponent(result.error)}`);
    }
    redirectWithActiveTenant(result.data.id, "/dashboard/settings?success=branding");
  }

  const engineeringFlags = {
    existingOrgSetup: process.env.ENABLE_EXISTING_ORG_SETUP === "true",
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL?.trim()),
    clerkWebhookSecretConfigured: Boolean(process.env.CLERK_WEBHOOK_SECRET?.trim()),
    stripeSecretConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    stripeWebhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
  };
  const clerkSecretMode = keyModeFromPrefix(process.env.CLERK_SECRET_KEY);
  const stripeSecretMode = keyModeFromPrefix(process.env.STRIPE_SECRET_KEY);
  const appEnvironment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
  const dbHealth = await (async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Portal & setup"
        description={`Operator setup for ${activeTenant ? communityLabel(activeTenant.slug) : "your community"}: public portal URL, website links, and whether your Clerk login maps to this tenant. Access is enforced by Clerk org membership, not a separate admin table.`}
      />

      {activeTenant && (
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-foreground">Public portal branding</h2>
            <p className="mt-1 text-sm text-muted-foreground">Shown on your public portal header.</p>
            <form action={updateBrandingAction} className="mt-4 grid gap-3 md:grid-cols-2">
              <TenantScopeHiddenFields tenantId={activeTenant.id} />
              <FormField label="Tagline" className="md:col-span-2">
                <Input name="publicTagline" defaultValue={branding?.publicTagline ?? ""} />
              </FormField>
              <FormField label="Contact email">
                <Input name="publicContactEmail" type="email" defaultValue={branding?.publicContactEmail ?? ""} />
              </FormField>
              <FormField label="Contact phone">
                <Input name="publicContactPhone" defaultValue={branding?.publicContactPhone ?? ""} />
              </FormField>
              <FormField label="Logo URL" className="md:col-span-2">
                <Input name="logoUrl" type="url" defaultValue={branding?.logoUrl ?? ""} placeholder="https://..." />
              </FormField>
              <div className="md:col-span-2">
                <Button type="submit">Save branding</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {activeTenant && portalUrl && (
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-foreground">Tenant & mapping</h2>
            <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm text-foreground">
              <Row label="Community">{communityLabel(activeTenant.slug)}</Row>
              <Row label="Tenant name">{activeTenant.name}</Row>
              <Row label="Tenant slug (portal path)">
                <span className="font-mono">{activeTenant.slug}</span>
              </Row>
              <Row label="Public portal URL">
                <a href={portalUrl} target="_blank" rel="noreferrer" className="break-all text-primary underline">
                  {portalUrl}
                </a>
              </Row>
              <Row label="Clerk org ID">
                <span className="break-all font-mono text-xs">{activeTenant.clerkOrgId}</span>
              </Row>
              <Row label="Your Clerk role">
                <Badge variant="brand">{clerkOrgRoleLabel(activeClerkOrg?.role)}</Badge>
              </Row>
              <Row label="Tenant status">
                <Badge variant={activeTenant.status === "ACTIVE" ? "success" : "warning"}>
                  {tenantStatusLabel(activeTenant.status)}
                </Badge>
              </Row>
              <Row label="Mapping status">
                <Badge variant={activeClerkOrg ? "success" : "danger"}>
                  {tenantMappingStatusLabel({
                    tenantStatus: activeTenant.status,
                    hasClerkMembership: Boolean(activeClerkOrg),
                  })}
                </Badge>
              </Row>
              <Row label="Contacts in dashboard">{summary?.contactsTotal ?? 0}</Row>
              <Row label="Published events">{summary?.eventsTotal ?? 0} total in DB</Row>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyTextButton text={portalUrl} label="Copy portal URL" />
              <Link href="/dashboard" className="text-sm text-primary underline">
                Back to overview
              </Link>
              {canSwitchCommunity && (
                <Link href="/api/select-tenant?reason=prepare-switch" className="text-sm text-primary underline">
                  Switch community
                </Link>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">Communities you can access</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on your Clerk sign-in. If a community is missing, someone needs to add {user.email ?? "your account"}{" "}
            to that community&apos;s Clerk organization.
          </p>
          {mappedTenants.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No communities mapped to this login yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {mappedTenants.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-muted/40 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                      {t.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">{communityLabel(t.slug)}</p>
                      <p className="text-xs text-muted-foreground">{t.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.id === activeTenant?.id ? "success" : "default"}>
                      {t.id === activeTenant?.id ? "Currently viewing" : "Available"}
                    </Badge>
                    {t.id !== activeTenant?.id && (
                      <form action="/api/select-tenant" method="POST">
                        <input type="hidden" name="tenantId" value={t.id} />
                        <button type="submit" className="text-xs font-bold text-primary hover:text-foreground">
                          Switch →
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {activeTenant && portalUrl && (
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-foreground">How your website connects</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              <strong>You (operator)</strong> use this dashboard at{" "}
              <span className="font-mono text-xs">{configuredAppUrl()}</span> with Clerk sign-in.{" "}
              <strong>Website visitors</strong> never sign in here — they use the public portal URLs below (linked or
              embedded from your community website).
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>
                <strong>Link-out:</strong> buttons on your site open portal pages; add <code className="font-mono">returnTo</code>{" "}
                so visitors return to your site after registration.
              </li>
              <li>
                <strong>Embed API:</strong> your site calls the events JSON endpoint and renders its own event cards.
              </li>
              <li>
                <strong>Embed iframe:</strong> append <code className="font-mono">?embed=1</code> to a portal URL for a
                minimal form inside your page.
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Full deployment checklist:{" "}
              <code className="rounded bg-muted px-1 font-mono">docs/13-TENANT-WEBSITE-INTEGRATION.md</code> in the repo.
            </p>
            <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-foreground">Example iframe (newsletter form)</p>
              <CopyTextButton
                text={portalEmbedUrl(`/portal/${activeTenant.slug}/contact?interest=newsletter`)}
                label="Copy embed URL"
              />
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] text-muted-foreground">{`<iframe title="Stay updated" src="${portalEmbedUrl(`/portal/${activeTenant.slug}/contact?interest=newsletter`)}" class="w-full min-h-[520px] border-0 rounded-xl" />`}</pre>
            </div>
          </CardBody>
        </Card>
      )}

      {tenantLinks.length > 0 && (
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-foreground">Website links to copy</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Point your website CTAs here for {activeTenant ? communityLabel(activeTenant.slug) : "this community"}.
              Visitors do not sign in with Clerk.
            </p>
            <ul className="mt-3 space-y-3 text-sm text-foreground">
              {tenantLinks.map((link) => (
                <li key={link.href}>
                  <p className="font-medium">{link.label}</p>
                  {link.hint && <p className="text-xs text-muted-foreground">{link.hint}</p>}
                  <a href={link.href} target="_blank" rel="noreferrer" className="mt-1 block break-all font-mono text-primary underline">
                    {link.href}
                  </a>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold text-foreground">Pilot scope</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This release is{" "}
            <strong>
              contacts, portal leads, event tickets, registrations, check-in, memberships, public membership checkout, and
              receipts
            </strong>{" "}
            for this community. Not included yet: online event checkout, refund operations, automated email campaigns, or
            Raklet-style website builder. Donations and membership checkout are live.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-foreground">How access works</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Clerk sign-in proves who you are.</li>
            <li>Clerk org membership determines which tenants you can open.</li>
            <li>The dashboard cookie only remembers which tenant you last selected.</li>
            <li>
              Public visitors use <span className="font-mono">/portal/{"{slug}"}</span> only.
            </li>
          </ul>
        </CardBody>
      </Card>

      {!selfServeOnboardingEnabled() && (
        <p className="text-sm text-muted-foreground">
          New communities cannot be self-served in this pilot. Contact your administrator for access changes.
        </p>
      )}

      <details className="jg-card p-5">
        <summary className="cursor-pointer text-sm font-medium text-foreground">Advanced diagnostics (engineering)</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          For operators troubleshooting mapping. Slug repair, QA cleanup, and reconciliation run outside this UI.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-y-2 text-sm text-foreground">
          <Row label="Signed-in user">{user.email ?? user.name ?? user.id}</Row>
          <Row label="Tenant resolution">{resolution.status}</Row>
          {resolution.status === "ONE_TENANT" && (
            <Row label="Resolution source">
              {resolution.source === "active-cookie" ? "Saved tenant preference" : "Single mapped tenant"}
            </Row>
          )}
          <Row label="Mapped tenants">{mappedTenants.length}</Row>
          <Row label="Clerk orgs on account">{clerkOrgs.length}</Row>
          <Row label="Stale tenant cookie cleared">{resolution.staleCookieIgnored ? "yes" : "no"}</Row>
          <Row label="App URL">
            <span className="font-mono text-xs">{configuredAppUrl()}</span>
          </Row>
          <Row label="Runtime">{appEnvironment}</Row>
          <Row label="Database">{dbHealth ? "reachable" : "unreachable"}</Row>
          <Row label="Clerk keys">
            {currentClerkMode()} publishable · {clerkSecretMode} secret
          </Row>
          <Row label="Clerk webhook secret">
            {engineeringFlags.clerkWebhookSecretConfigured ? "configured" : "missing"}
          </Row>
          <Row label="Stripe checkout">
            {engineeringFlags.stripeSecretConfigured ? `${stripeSecretMode} key configured` : "not configured"}
          </Row>
          <Row label="Stripe webhook secret">
            {engineeringFlags.stripeWebhookSecretConfigured ? "configured" : "missing"}
          </Row>
          <Row label="Payment fee policy">{paymentFeeDisclosure()}</Row>
          <Row label="Existing-org mapping flag">
            {engineeringFlags.existingOrgSetup ? "enabled (non-pilot)" : "disabled"}
          </Row>
        </dl>
        {unmappedOrgs.length > 0 && (
          <Alert variant="warning" className="mt-4">
            <p className="font-medium">Clerk orgs not linked to a tenant</p>
            <ul className="mt-2 list-disc pl-5">
              {unmappedOrgs.map((org) => (
                <li key={org.clerkOrgId}>
                  {org.name} ({clerkOrgRoleLabel(org.role)})
                </li>
              ))}
            </ul>
          </Alert>
        )}
        {activeTenant && (
          <Link
            href={`/onboarding/complete?tenantId=${encodeURIComponent(activeTenant.id)}`}
            className="mt-4 inline-block text-xs text-primary underline"
          >
            Onboarding receipt
          </Link>
        )}
      </details>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="sm:text-right">{children}</dd>
    </div>
  );
}
