"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CreditCard, LayoutDashboard, Settings, UsersRound } from "lucide-react";
import { PILOT_DASHBOARD_NAV } from "@/lib/pilot/dashboard-nav";

const navIcons = {
  "/dashboard": LayoutDashboard,
  "/dashboard/members": UsersRound,
  "/dashboard/tiers": CreditCard,
  "/dashboard/events": CalendarDays,
  "/dashboard/settings": Settings,
} as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {PILOT_DASHBOARD_NAV.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = navIcons[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              active
                ? "bg-white font-semibold text-slate-950 shadow-sm ring-1 ring-stone-200"
                : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
