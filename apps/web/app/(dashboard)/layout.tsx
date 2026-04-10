import * as React from 'react';
import { requireTenantAdmin } from '@/lib/auth';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireTenantAdmin();
  return (
    <QueryProvider>
      <DashboardShell>{children}</DashboardShell>
    </QueryProvider>
  );
}
