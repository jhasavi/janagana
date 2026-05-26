import { NextResponse } from "next/server";

/**
 * ARCHITECTURE CONTRACT — middleware.ts
 *
 * Foundation milestone middleware is intentionally neutral.
 * Real Clerk enforcement will be enabled in the next milestone.
 * This avoids requiring production-ready Clerk keys in skeleton CI checks.
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

export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
