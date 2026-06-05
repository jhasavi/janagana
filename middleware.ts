import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/portal(.*)",
  "/api/health/ready",
  "/api/webhooks(.*)",
]);

const isProtectedRoute = createRouteMatcher([
  "/",
  "/dashboard(.*)",
  "/select-organization(.*)",
  "/onboarding/create-organization(.*)",
  "/onboarding/complete(.*)",
  "/api/active-org(.*)", // legacy alias → prefer /api/active-tenant
  "/api/active-tenant(.*)",
  "/api/select-tenant(.*)",
  "/api/sign-out(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  if (!isProtectedRoute(request)) {
    return NextResponse.next();
  }

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
