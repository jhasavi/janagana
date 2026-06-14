import { redirect } from "next/navigation";

/** Relative dashboard paths only — blocks open redirects. */
export function isSafeDashboardReturnPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }
  if (!path.startsWith("/dashboard")) {
    return false;
  }
  return true;
}

/**
 * After a dashboard server action, bounce through /api/select-tenant so the
 * active-tenant cookie is set on the redirect response (reliable on Vercel).
 */
export function redirectWithActiveTenant(tenantId: string, returnTo: string): never {
  const safeReturnTo = isSafeDashboardReturnPath(returnTo) ? returnTo : "/dashboard";
  const params = new URLSearchParams({
    reason: "persist",
    tenantId,
    returnTo: safeReturnTo,
  });
  redirect(`/api/select-tenant?${params.toString()}`);
}

export function tenantIdFromMutation(
  hint: string | undefined,
  record?: { tenantId?: string } | null
): string | null {
  const fromRecord = record?.tenantId?.trim();
  if (fromRecord) return fromRecord;
  const fromHint = hint?.trim();
  return fromHint || null;
}
