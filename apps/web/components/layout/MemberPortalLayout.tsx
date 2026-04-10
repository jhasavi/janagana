'use client';

import * as React from 'react';
import { UserButton } from '@clerk/nextjs';
import { MemberPortalSidebar } from './MemberPortalSidebar';
import { MobilePortalMenu } from '@/components/portal/MobilePortalMenu';
import { NotificationBell } from '@/components/layout/NotificationBell';

interface MemberPortalLayoutProps {
  children: React.ReactNode;
}

export function MemberPortalLayout({ children }: MemberPortalLayoutProps) {
  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden md:flex md:w-72 md:flex-col border-r bg-sidebar text-sidebar-foreground">
        <MemberPortalSidebar />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3">
            <MobilePortalMenu />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Member Portal</p>
              <p className="text-sm font-semibold">Your community hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
