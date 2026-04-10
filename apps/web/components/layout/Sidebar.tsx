'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  LayoutDashboard, Users, CalendarDays, Heart, Building2,
  MessageSquare, CreditCard, BarChart3, ShieldCheck, Settings, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getRoleFromPublicMetadata, hasPermission } from '@/lib/auth';
import type { Permission } from '@orgflow/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: Permission;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Members', href: '/dashboard/members', icon: Users, permission: 'members:view' },
  { label: 'Events', href: '/dashboard/events', icon: CalendarDays, permission: 'events:view' },
  { label: 'Volunteers', href: '/dashboard/volunteers', icon: Heart, permission: 'volunteers:view' },
  { label: 'Clubs', href: '/dashboard/clubs', icon: Building2, permission: 'clubs:view' },
  { label: 'Communications', href: '/dashboard/communications', icon: MessageSquare, permission: 'communications:view' },
  { label: 'Payments', href: '/dashboard/payments', icon: CreditCard, permission: 'payments:view' },
  { label: 'Reports', href: '/dashboard/reports', icon: Download },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, permission: 'analytics:view' },
  { label: 'Audit', href: '/dashboard/audit', icon: ShieldCheck },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings:view' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const role = getRoleFromPublicMetadata(user?.publicMetadata as Record<string, unknown> | null | undefined);
  const navItemsToShow = navItems.filter((item) => !item.permission || hasPermission(role, item.permission));

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'sidebar-transition flex flex-col border-r bg-sidebar text-sidebar-foreground',
          collapsed ? 'w-16' : 'w-[var(--sidebar-width)]',
        )}
      >
        {/* Logo area */}
        <div className={cn('flex h-[var(--topbar-height)] items-center border-b px-4', collapsed && 'justify-center px-0')}>
          {collapsed ? (
            <span className="text-xl font-bold text-primary">O</span>
          ) : (
            <span className="text-xl font-bold tracking-tight">OrgFlow</span>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2" aria-label="Main navigation">
            {navItemsToShow.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-md mx-auto transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="sr-only">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

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

        {/* Collapse toggle */}
        <div className="border-t p-2 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent/50"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
