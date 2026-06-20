import { configuredAppUrl } from "@/lib/environment";

export type IntegrationLevel = "link" | "embed-api" | "embed-iframe";

export type TenantIntegrationLink = {
  label: string;
  href: string;
  hint: string;
  level: IntegrationLevel;
};

/** Append ?embed=1 for iframe embedding on tenant websites (minimal chrome). */
export function portalEmbedUrl(path: string): string {
  const base = configuredAppUrl().replace(/\/$/, "");
  const full = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const sep = full.includes("?") ? "&" : "?";
  return `${full}${sep}embed=1`;
}

export const INTEGRATION_LEVEL_LABELS: Record<IntegrationLevel, string> = {
  link: "Link from your website (opens JanaGana; use returnTo to come back)",
  "embed-api": "Your site renders data (embed JSON API)",
  "embed-iframe": "Embed in your page (iframe + ?embed=1)",
};
