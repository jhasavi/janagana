import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * ARCHITECTURE CONTRACT — middleware.ts
 *
 * This middleware uses REAL Clerk only.
 * There is NO test-auth fallthrough here.
 * Synthetic test auth is handled in a completely separate Playwright config
 * (playwright.real-clerk.config.ts) that uses real credentials.
 *
 * Public routes (no auth required):
 *   - /portal/[tenantSlug]/** — public visitor pages
 *   - /sign-in, /sign-up — Clerk auth
 *   - /api/webhooks/** — Clerk/Stripe webhooks use their own signature verification
 *
 * Protected routes (Clerk auth required):
 *   - /dashboard/**
 *   - /onboarding/**
 *   - /select-organization
 *   - /api/active-org
 *   - /api/sign-out
 */

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/portal(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Protect all non-public routes
  const { userId } = await auth();

  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
