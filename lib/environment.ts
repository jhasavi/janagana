export type KeyMode = "test" | "live" | "unknown";

export function keyModeFromPrefix(key: string | undefined | null): KeyMode {
  const value = key?.trim() ?? "";
  if (value.startsWith("pk_test_") || value.startsWith("sk_test_")) return "test";
  if (value.startsWith("pk_live_") || value.startsWith("sk_live_")) return "live";
  return "unknown";
}

export function currentClerkMode(): KeyMode {
  return keyModeFromPrefix(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export function configuredAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3020").replace(/\/$/, "");
}

export function publicPortalUrl(tenantSlug: string): string {
  return `${configuredAppUrl()}/portal/${tenantSlug}`;
}
