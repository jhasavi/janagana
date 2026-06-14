import { isPilotTenantSlug } from "@/lib/pilot/tenants";

/** Operator websites visitors may return to after portal forms. */
const ALLOWED_RETURN_HOSTS = new Set([
  "www.thepurplewings.org",
  "thepurplewings.org",
  "namasteneedham.com",
  "www.namasteneedham.com",
  "localhost",
  "127.0.0.1",
]);

const DEFAULT_RETURN_BY_TENANT: Record<string, string> = {
  "purple-wings": "https://www.thepurplewings.org/events",
  "namaste-boston": "https://namasteneedham.com",
};

export function isSafeVisitorReturnUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_RETURN_HOSTS.has(host)) {
      return true;
    }
    return host.endsWith(".thepurplewings.org");
  } catch {
    return false;
  }
}

export function readSafeReturnUrl(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || !isSafeVisitorReturnUrl(trimmed)) {
    return null;
  }
  return trimmed;
}

export function defaultVisitorReturnUrl(tenantSlug: string): string | null {
  if (!isPilotTenantSlug(tenantSlug)) {
    return null;
  }
  return DEFAULT_RETURN_BY_TENANT[tenantSlug] ?? null;
}

export function visitorReturnUrlWithStatus(
  baseUrl: string,
  statusKey: string,
  statusValue: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set(statusKey, statusValue);
  return url.toString();
}
