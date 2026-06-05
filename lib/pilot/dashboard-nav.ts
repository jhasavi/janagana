import { PILOT_TENANT_SLUGS, type PilotTenantSlug } from "@/lib/pilot/tenants";

/** Pilot operator navigation — two-community scope. */
export const PILOT_DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/members", label: "Contacts & leads" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/settings", label: "Portal & setup" },
] as const;

export { PILOT_TENANT_SLUGS, type PilotTenantSlug, isPilotTenantSlug, communityLabel, portalLinksForTenant } from "@/lib/pilot/tenants";

export function selfServeOnboardingEnabled(): boolean {
  return process.env.ENABLE_SELF_SERVE_ONBOARDING === "true";
}
