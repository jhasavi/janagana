import * as React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant';
import { TenantPublicNav, PublicFooter } from '@/components/public/PublicShell';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TenantPublicNav tenantSlug={tenant.slug} tenantName={tenant.name} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
