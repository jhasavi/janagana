'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2, Palette, Globe, AlignJustify,
  Users, CreditCard, AlertTriangle, ShieldCheck,
  Mail, Puzzle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    group: 'Organisation',
    items: [
      { label: 'Organization Profile', href: '/dashboard/settings/organization', icon: Building2 },
      { label: 'Branding & Appearance', href: '/dashboard/settings/branding', icon: Palette },
      { label: 'Member Portal', href: '/dashboard/settings/member-portal', icon: Globe },
    ],
  },
  {
    group: 'Members',
    items: [
      { label: 'Custom Fields', href: '/dashboard/settings/custom-fields', icon: AlignJustify },
    ],
  },
  {
    group: 'Communication',
    items: [
      { label: 'Email Settings', href: '/dashboard/settings/email', icon: Mail },
      { label: 'Integrations', href: '/dashboard/settings/integrations', icon: Puzzle },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Team Members', href: '/dashboard/settings/team', icon: Users },
      { label: 'Billing & Plan', href: '/dashboard/settings/billing', icon: CreditCard },
      { label: 'Security', href: '/dashboard/settings/security', icon: ShieldCheck },
      { label: 'Danger Zone', href: '/dashboard/settings/danger', icon: AlertTriangle },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-8 min-h-full">
      {/* Left sidebar */}
      <aside className="w-52 shrink-0">
        <div className="sticky top-6 space-y-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          {NAV_ITEMS.map(group => (
            <div key={group.group}>
              <p className="mb-1 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.group}
              </p>
              <nav className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
