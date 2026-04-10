'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getRoleFromPublicMetadata, hasPermission } from '@/lib/auth';
import type { Permission } from '@orgflow/types';

interface DashboardNavItem {
  label: string;
  href: string;
  permission?: Permission;
}

const DASHBOARD_NAV: DashboardNavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Members', href: '/dashboard/members', permission: 'members:view' },
  { label: 'Events', href: '/dashboard/events', permission: 'events:view' },
  { label: 'Volunteers', href: '/dashboard/volunteers', permission: 'volunteers:view' },
  { label: 'Clubs', href: '/dashboard/clubs', permission: 'clubs:view' },
  { label: 'Communications', href: '/dashboard/communications', permission: 'communications:view' },
  { label: 'Payments', href: '/dashboard/payments', permission: 'payments:view' },
  { label: 'Reports', href: '/dashboard/reports' },
  { label: 'Analytics', href: '/dashboard/analytics', permission: 'analytics:view' },
  { label: 'Audit', href: '/dashboard/audit' },
  { label: 'Settings', href: '/dashboard/settings', permission: 'settings:view' },
];

export function DashboardMobileMenu() {
  const { user } = useUser();
  const role = getRoleFromPublicMetadata(user?.publicMetadata as Record<string, unknown> | null | undefined);
  const visibleNav = DASHBOARD_NAV.filter((item) => !item.permission || hasPermission(role, item.permission));

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-xs">
        <div className="flex items-center justify-between pb-4">
          <div>
            <p className="text-sm font-semibold">OrgFlow</p>
            <p className="text-xs text-muted-foreground">Admin navigation</p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </SheetClose>
        </div>
        <nav className="space-y-2">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-2xl px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
