import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { configuredAppUrl } from "@/lib/environment";

export const MEMBER_SESSION_COOKIE_NAME = "JG_MEMBER_SESSION";
const MEMBER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function generateMemberToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashMemberToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function memberSessionCookieOptions() {
  const secure = configuredAppUrl().startsWith("https://");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/portal",
    maxAge: MEMBER_SESSION_MAX_AGE_SECONDS,
  };
}

export async function getMemberSessionCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(MEMBER_SESSION_COOKIE_NAME)?.value ?? null;
}

export async function setMemberSessionCookie(rawToken: string): Promise<void> {
  const store = await cookies();
  store.set(MEMBER_SESSION_COOKIE_NAME, rawToken, memberSessionCookieOptions());
}

export async function clearMemberSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(MEMBER_SESSION_COOKIE_NAME);
}

export function applyMemberSessionCookieToResponse(response: NextResponse, rawToken: string): NextResponse {
  response.cookies.set(MEMBER_SESSION_COOKIE_NAME, rawToken, memberSessionCookieOptions());
  return response;
}

export function clearMemberSessionCookieOnResponse(response: NextResponse): NextResponse {
  response.cookies.delete(MEMBER_SESSION_COOKIE_NAME);
  return response;
}
