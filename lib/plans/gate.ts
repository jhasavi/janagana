export function isPro(tenant: { plan: string }): boolean {
  return tenant.plan === "PRO";
}

/** Free-plan caps for features that stay usable, just capped, below Pro. */
export const FREE_LIMITS = {
  customFields: 1,
  publishedEvents: 3,
  membershipTiers: 1,
} as const;

export const UPGRADE_REQUIRED_ERROR = "This is a Pro feature. Upgrade to unlock it.";
