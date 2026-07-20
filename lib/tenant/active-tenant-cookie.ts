import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { configuredAppUrl } from "@/lib/environment";
import { ACTIVE_TENANT_COOKIE_NAME } from "@/lib/tenant/contract";

const ACTIVE_TENANT_COOKIE = ACTIVE_TENANT_COOKIE_NAME;
const LEGACY_COOKIES = ["JG_ACTIVE_ORG", "JG_ACTIVE_ORG_ID"];

export function activeTenantCookieOptions() {
  const secure = configuredAppUrl().startsWith("https://");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function getActiveTenantCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_TENANT_COOKIE)?.value ?? null;
}

export async function setActiveTenantCookie(tenantId: string): Promise<void> {
  const store = await cookies();
  try {
    store.set(ACTIVE_TENANT_COOKIE, tenantId, activeTenantCookieOptions());
  } catch (error) {
    // Next.js forbids cookie writes during Server Component render (only
    // Server Actions/Route Handlers may mutate cookies). requireActiveTenantForActions()
    // is called from both; from render this write is best-effort only — the
    // resolved tenant is still correct, and an explicit tenant switch always
    // goes through /api/select-tenant (a real Route Handler) where the write
    // succeeds for real.
    console.info("ACTIVE_TENANT_COOKIE_WRITE_SKIPPED", {
      tenantId,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

export function applyActiveTenantCookieToResponse(response: NextResponse, tenantId: string): NextResponse {
  response.cookies.set(ACTIVE_TENANT_COOKIE, tenantId, activeTenantCookieOptions());
  return response;
}

export async function clearActiveTenantCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_TENANT_COOKIE);
  for (const name of LEGACY_COOKIES) {
    store.delete(name);
  }
}
