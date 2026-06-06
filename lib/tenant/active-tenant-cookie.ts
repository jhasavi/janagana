import { cookies } from "next/headers";
import { configuredAppUrl } from "@/lib/environment";
import { ACTIVE_TENANT_COOKIE_NAME } from "@/lib/tenant/contract";

const ACTIVE_TENANT_COOKIE = ACTIVE_TENANT_COOKIE_NAME;
const LEGACY_COOKIES = ["JG_ACTIVE_ORG", "JG_ACTIVE_ORG_ID"];

export async function getActiveTenantCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_TENANT_COOKIE)?.value ?? null;
}

export async function setActiveTenantCookie(tenantId: string): Promise<void> {
  const store = await cookies();
  const secure = configuredAppUrl().startsWith("https://");
  store.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearActiveTenantCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_TENANT_COOKIE);
  for (const name of LEGACY_COOKIES) {
    store.delete(name);
  }
}
