'use client';

import * as React from 'react';
import Link from 'next/link';
import { UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DashboardMobileMenu } from '@/components/layout/DashboardMobileMenu';

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center border-b bg-background px-4 gap-4 sm:px-6">
      <div className="flex items-center gap-3">
        <DashboardMobileMenu />
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: 'hidden md:flex items-center',
              organizationSwitcherTrigger: 'rounded-md px-2 py-1 hover:bg-muted text-sm',
            },
          }}
          hidePersonal
        />
      </div>

      <div className="flex-1" />

      <Link href="/dashboard/search" className="inline-flex">
        <Button asChild variant="ghost" size="icon" aria-label="Search">
          <span>
            <Search className="h-4 w-4" />
          </span>
        </Button>
      </Link>

      <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <UserButton
        appearance={{
          elements: {
            avatarBox: 'h-8 w-8',
          },
        }}
        afterSignOutUrl="/sign-in"
      />
    </header>
  );
}
