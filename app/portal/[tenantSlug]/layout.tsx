import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { getTenantBySlug } from "@/lib/tenant";
import { getCurrentMemberContact } from "@/lib/actions/member-auth";

export default async function PortalTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    notFound();
  }

  const shellTenant = {
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    publicTagline: tenant.publicTagline,
    directoryEnabled: tenant.directoryEnabled,
  };

  const currentMember = await getCurrentMemberContact(tenantSlug);
  const shellMember = currentMember ? { firstName: currentMember.contact.firstName } : null;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground">
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" aria-hidden />
          </main>
        </div>
      }
    >
      <PortalShell tenant={shellTenant} member={shellMember}>{children}</PortalShell>
    </Suspense>
  );
}
