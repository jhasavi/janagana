import { PILOT_TENANT_SLUGS, type PilotTenantSlug } from "@/lib/pilot/tenants";

export type DashboardNavStatus = "live" | "coming-soon";

export type DashboardNavItem = {
  href: string;
  label: string;
  status: DashboardNavStatus;
};

export type DashboardNavGroup = {
  label?: string;
  items: readonly DashboardNavItem[];
};

/** Community OS operator navigation — grouped by workflow area. */
export const COMMUNITY_OS_NAV: readonly DashboardNavGroup[] = [
  {
    items: [{ href: "/dashboard", label: "Dashboard", status: "live" }],
  },
  {
    label: "People",
    items: [
      { href: "/dashboard/members", label: "Contacts", status: "live" },
      { href: "/dashboard/families", label: "Families", status: "coming-soon" },
      { href: "/dashboard/volunteers", label: "Volunteers", status: "coming-soon" },
    ],
  },
  {
    label: "Programs",
    items: [
      { href: "/dashboard/tiers", label: "Memberships", status: "live" },
      { href: "/dashboard/memberships/renewals", label: "Renewals", status: "live" },
      { href: "/dashboard/events", label: "Events", status: "live" },
      { href: "/dashboard/donations", label: "Donations", status: "live" },
      { href: "/dashboard/sponsors", label: "Sponsors", status: "coming-soon" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/dashboard/payments", label: "Payments", status: "live" },
      { href: "/dashboard/communications", label: "Communications", status: "coming-soon" },
      { href: "/dashboard/settings", label: "Settings", status: "live" },
    ],
  },
] as const;

/** Flat list for tests and legacy callers. */
export const PILOT_DASHBOARD_NAV = COMMUNITY_OS_NAV.flatMap((group) => group.items);

/** Hide unfinished modules from sidebar during pilot (default on). Set PILOT_HIDE_COMING_SOON_NAV=false to show all. */
export function hideComingSoonNav(): boolean {
  return process.env.PILOT_HIDE_COMING_SOON_NAV !== "false";
}

export function getVisibleCommunityOsNav(): DashboardNavGroup[] {
  if (!hideComingSoonNav()) {
    return COMMUNITY_OS_NAV.map((group) => ({
      label: group.label,
      items: [...group.items],
    }));
  }
  return COMMUNITY_OS_NAV.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => item.status === "live"),
  })).filter((group) => group.items.length > 0);
}

export { PILOT_TENANT_SLUGS, type PilotTenantSlug, isPilotTenantSlug, communityLabel, portalLinksForTenant } from "@/lib/pilot/tenants";

export function selfServeOnboardingEnabled(): boolean {
  return process.env.ENABLE_SELF_SERVE_ONBOARDING === "true";
}
