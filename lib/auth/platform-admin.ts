import type { CurrentUserSummary } from "@/lib/auth/current-user";

/**
 * JanaGana operators (not tenant admins). Comma-separated emails in
 * JANAGANA_PLATFORM_ADMIN_EMAILS; empty/unset means nobody has platform access.
 */
export function platformAdminEmails(env: Record<string, string | undefined> = process.env): string[] {
  return (env.JANAGANA_PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(user: Pick<CurrentUserSummary, "email"> | null, env?: Record<string, string | undefined>) {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  return platformAdminEmails(env).includes(email);
}
