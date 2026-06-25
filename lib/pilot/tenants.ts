/** Canonical NB + TPW pilot tenant config — single place for slug/name/portal CTAs. */

import { configuredAppUrl } from "@/lib/environment";

export const PILOT_TENANT_SLUGS = ["namaste-boston", "purple-wings"] as const;

export type PilotTenantSlug = (typeof PILOT_TENANT_SLUGS)[number];

export const PILOT_TENANTS: Record<
  PilotTenantSlug,
  { slug: PilotTenantSlug; name: string; websiteUrl: string }
> = {
  "namaste-boston": {
    slug: "namaste-boston",
    name: "Namaste Boston",
    websiteUrl: "https://www.namastebostonhomes.com",
  },
  "purple-wings": {
    slug: "purple-wings",
    name: "The Purple Wings",
    websiteUrl: "https://www.thepurplewings.org",
  },
};

/** Marketing site visitors return to after portal forms (when returnTo is omitted). */
export function tenantWebsiteUrl(slug: string): string | null {
  if (!isPilotTenantSlug(slug)) return null;
  return PILOT_TENANTS[slug].websiteUrl;
}

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

const COMMON_LINKS = (root: string, slug: string): PortalLink[] => [
  { label: "Portal home", href: root, hint: "Link from your website — visitors open JanaGana portal (no Clerk sign-in)" },
  { label: "Events listing", href: `${root}/events`, hint: "Or render events on your site via embed API (see Portal & setup)" },
  { label: "Membership join", href: `${root}/join` },
  { label: "Donate", href: `${root}/donate`, hint: "One-time gifts via Stripe Checkout" },
  {
    label: "Newsletter / community updates",
    href: `${root}/contact?interest=newsletter`,
    hint: "Add ?embed=1 for iframe on your site; use returnTo so visitors come back after submit",
  },
  {
    label: "Embed events API (JSON)",
    href: `${configuredAppUrl().replace(/\/$/, "")}/api/embed/events?tenantSlug=${slug}`,
    hint: "Your website fetches events and renders its own cards (TPW /events pattern)",
  },
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
    return [...COMMON_LINKS(root, slug), ...EXTRA_LINKS[slug]];
  }
  return [...COMMON_LINKS(root, slug), { label: "Contact form", href: `${root}/contact` }];
}
