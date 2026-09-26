/** JanaGana is 100% free — every feature is unlocked for every tenant. */
export function isPro(_tenant: { plan: string }): boolean {
  return true;
}

/** Retained for call sites that still reference these; no cap is enforced since isPro() is always true. */
export const FREE_LIMITS = {
  customFields: 1,
  publishedEvents: 3,
  membershipTiers: 1,
} as const;

export const UPGRADE_REQUIRED_ERROR = "This is a Pro feature. Upgrade to unlock it.";
