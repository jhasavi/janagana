import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { getTenantBySlug } from "@/lib/tenant";

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
  };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f3ec] text-slate-950">
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">{children}</main>
        </div>
      }
    >
      <PortalShell tenant={shellTenant}>{children}</PortalShell>
    </Suspense>
  );
}
