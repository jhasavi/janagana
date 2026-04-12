import type { Metadata } from 'next';
import { getCurrentTenant } from '@/lib/tenant';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  return {
    title: {
      default: tenant ? `${tenant.name} — Sign In` : 'Sign In',
      template: `%s | ${tenant?.name ?? 'Jana Gana'}`,
    },
  };
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
