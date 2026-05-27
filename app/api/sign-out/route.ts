import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { clearActiveTenantCookies } from "@/lib/tenant";

/**
 * POST /api/sign-out
 *
 * Signs the user out from Clerk and clears any app-level session cookies.
 */
export async function POST(request: Request) {
  const { userId, sessionId } = await auth();
  await clearActiveTenantCookies();

  if (userId && sessionId) {
    const client = await clerkClient();
    await client.sessions.revokeSession(sessionId);
  }

  const requestOrigin = new URL(request.url).origin;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const baseUrl = requestOrigin || appUrl || "http://localhost:3020";

  return NextResponse.redirect(new URL("/sign-in", baseUrl));
}
