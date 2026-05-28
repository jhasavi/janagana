import type { NextRequest } from "next/server";

/**
 * Best-effort CSRF guard for state-changing route handlers.
 * Accepts same-origin Origin, Referer, or Sec-Fetch-Site signals.
 */
export function isSameOriginMutationRequest(req: NextRequest | Request): boolean {
  const requestUrl = new URL(req.url);
  const expectedOrigin = requestUrl.origin;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  const fetchSite = req.headers.get("sec-fetch-site");
  return fetchSite === "same-origin";
}
