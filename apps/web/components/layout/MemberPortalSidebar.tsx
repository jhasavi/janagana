'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User, CreditCard, CalendarDays, Heart, Building2, BookOpen, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const memberNavItems: NavItem[] = [
  { label: 'Home', href: '/portal', icon: User },
  { label: 'My Profile', href: '/portal/profile', icon: User },
  { label: 'Membership', href: '/portal/membership', icon: CreditCard },
  { label: 'Events', href: '/portal/events', icon: CalendarDays },
  { label: 'Volunteer', href: '/portal/volunteer', icon: Heart },
  { label: 'Clubs', href: '/portal/clubs', icon: Building2 },
  { label: 'Directory', href: '/portal/directory', icon: BookOpen },
  { label: 'Notifications', href: '/portal/notifications', icon: Bell },
  { label: 'Payments', href: '/portal/payments', icon: CreditCard },
];

export function MemberPortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-[var(--topbar-height)] items-center border-b px-6">
        <span className="text-lg font-semibold">Member Portal</span>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3" aria-label="Member portal navigation">
          {memberNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
