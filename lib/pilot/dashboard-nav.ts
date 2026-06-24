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
      { href: "/dashboard/events", label: "Events", status: "live" },
      { href: "/dashboard/donations", label: "Donations", status: "coming-soon" },
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

export { PILOT_TENANT_SLUGS, type PilotTenantSlug, isPilotTenantSlug, communityLabel, portalLinksForTenant } from "@/lib/pilot/tenants";

export function selfServeOnboardingEnabled(): boolean {
  return process.env.ENABLE_SELF_SERVE_ONBOARDING === "true";
}
