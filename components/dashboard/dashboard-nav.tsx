"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  CreditCard,
  HandHeart,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Mail,
  Settings,
  UsersRound,
  Wallet,
} from "lucide-react";
import { COMMUNITY_OS_NAV, type DashboardNavItem } from "@/lib/pilot/dashboard-nav";

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
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
        active
          ? "bg-white font-semibold text-slate-950 shadow-sm ring-1 ring-stone-200"
          : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.status === "coming-soon" && (
        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Soon
        </span>
      )}
    </Link>
  );
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-5">
      {COMMUNITY_OS_NAV.map((group) => (
        <div key={group.label ?? "root"}>
          {group.label && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {group.label}
            </p>
          )}
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
