"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Gift,
  HandHeart,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Mail,
  Settings,
  UsersRound,
  Wallet,
} from "lucide-react";
import { COMMUNITY_OS_NAV, type DashboardNavGroup, type DashboardNavItem } from "@/lib/pilot/dashboard-nav";
import { cn } from "@/lib/utils";

const navIcons: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/members": UsersRound,
  "/dashboard/families": Home,
  "/dashboard/volunteers": HandHeart,
  "/dashboard/tiers": CreditCard,
  "/dashboard/memberships/renewals": CalendarClock,
  "/dashboard/events": CalendarDays,
  "/dashboard/donations": HeartHandshake,
  "/dashboard/sponsors": Building2,
  "/dashboard/referrals": Gift,
  "/dashboard/payments": Wallet,
  "/dashboard/communications": Mail,
  "/dashboard/settings": Settings,
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: DashboardNavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = navIcons[item.href] ?? LayoutDashboard;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn("jg-nav-link", active && "jg-nav-link-active")}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.status === "coming-soon" && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground/80">
          Soon
        </span>
      )}
    </Link>
  );
}

export function DashboardNav({ groups }: { groups?: DashboardNavGroup[] }) {
  const pathname = usePathname();
  const navGroups = groups ?? COMMUNITY_OS_NAV.map((group) => ({ label: group.label, items: [...group.items] }));

  return (
    <nav className="space-y-1">
      {navGroups.map((group) => (
        <div key={group.label ?? "root"}>
          {group.label && <p className="jg-nav-group-label">{group.label}</p>}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
