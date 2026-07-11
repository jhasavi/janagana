"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  HeartHandshake,
  LayoutDashboard,
  Settings,
  UsersRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/members", label: "Contacts", icon: UsersRound },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/tiers", label: "Memberships", icon: CreditCard },
  { href: "/dashboard/memberships/renewals", label: "Renewals", icon: CalendarDays },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/donations", label: "Donations", icon: HeartHandshake },
  { href: "/dashboard/settings", label: "Setup", icon: Settings },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardWorkflowNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border/80 bg-card/80">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href, "exact" in tab ? tab.exact : false);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
