'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Home', href: '/portal' },
  { label: 'Profile', href: '/portal/profile' },
  { label: 'Membership', href: '/portal/membership' },
  { label: 'Events', href: '/portal/events' },
  { label: 'Volunteer', href: '/portal/volunteer' },
  { label: 'Clubs', href: '/portal/clubs' },
  { label: 'Directory', href: '/portal/directory' },
  { label: 'Notifications', href: '/portal/notifications' },
  { label: 'Payments', href: '/portal/payments' },
];

export function MobilePortalMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-xs">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-lg font-semibold">Navigate</h2>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        </div>
        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-xl px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted',
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
