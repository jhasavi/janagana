import * as React from 'react';
import { MarketingHeader, PublicFooter } from '@/components/public/PublicShell';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
