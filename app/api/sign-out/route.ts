import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/sign-out
 *
 * Signs the user out from Clerk and clears any app-level session cookies.
 */
export async function POST() {
  const { userId, sessionId } = await auth();

  // Clear any app-level cookies
  const cookieStore = await cookies();
  cookieStore.delete("JG_ACTIVE_ORG");

  if (userId && sessionId) {
    const client = await clerkClient();
    await client.sessions.revokeSession(sessionId);
  }

  return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
