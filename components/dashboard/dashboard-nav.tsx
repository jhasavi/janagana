"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PILOT_DASHBOARD_NAV } from "@/lib/pilot/dashboard-nav";

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {PILOT_DASHBOARD_NAV.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`block rounded-md px-3 py-2 text-sm ${
              active
                ? "bg-white font-medium text-gray-900 shadow-sm ring-1 ring-gray-200"
                : "text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
