/** Canonical NB + TPW pilot tenant config — single place for slug/name/portal CTAs. */

import { configuredAppUrl } from "@/lib/environment";

export const PILOT_TENANT_SLUGS = ["namaste-boston", "purple-wings"] as const;

export type PilotTenantSlug = (typeof PILOT_TENANT_SLUGS)[number];

export const PILOT_TENANTS: Record<
  PilotTenantSlug,
  { slug: PilotTenantSlug; name: string }
> = {
  "namaste-boston": { slug: "namaste-boston", name: "Namaste Boston" },
  "purple-wings": { slug: "purple-wings", name: "The Purple Wings" },
};

export function isPilotTenantSlug(slug: string): slug is PilotTenantSlug {
  return (PILOT_TENANT_SLUGS as readonly string[]).includes(slug);
}

export function communityLabel(slug: string): string {
  if (isPilotTenantSlug(slug)) return PILOT_TENANTS[slug].name;
  return slug;
}

export type PortalLink = {
  label: string;
  href: string;
  hint?: string;
};

function portalBase(slug: string): string {
  return `${configuredAppUrl().replace(/\/$/, "")}/portal/${slug}`;
}

const COMMON_LINKS = (root: string): PortalLink[] => [
  { label: "Portal home", href: root, hint: "Classes, events, and community entry" },
  { label: "Events listing", href: `${root}/events` },
  { label: "Membership join", href: `${root}/join` },
  { label: "Newsletter / community updates", href: `${root}/contact?interest=newsletter` },
];

const EXTRA_LINKS: Record<PilotTenantSlug, PortalLink[]> = {
  "namaste-boston": [
    {
      label: "Investment analysis inquiry",
      href: `${portalBase("namaste-boston")}/contact?interest=investment-analysis`,
      hint: "NB website Action center CTA",
    },
  ],
  "purple-wings": [
    {
      label: "Membership interest",
      href: `${portalBase("purple-wings")}/contact?interest=membership-interest`,
      hint: "Lead capture; use Membership join for paid checkout",
    },
    {
      label: "Class interest",
      href: `${portalBase("purple-wings")}/contact?interest=class`,
      hint: "Optional; class registration uses portal home",
    },
  ],
};

/** Public URLs operators copy onto NB/TPW websites. */
export function publicRegisterUrl(tenantSlug: string, eventSlug: string): string {
  return `${portalBase(tenantSlug)}/register/${eventSlug}`;
}

export function portalLinksForTenant(slug: string): PortalLink[] {
  const root = portalBase(slug);
  if (isPilotTenantSlug(slug)) {
    return [...COMMON_LINKS(root), ...EXTRA_LINKS[slug]];
  }
  return [...COMMON_LINKS(root), { label: "Contact form", href: `${root}/contact` }];
}
