import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { assertTenantProfileConfigured } from '@/lib/tenant-profile'

const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])
const isPortalRoute = createRouteMatcher(['/portal(.*)'])
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, request) => {
  // Fail fast on startup if tenant-specific profile config is incomplete.
  assertTenantProfileConfigured()

  const { userId } = await auth()

  // Redirect unauthenticated users to sign-in
  if (!userId) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', request.url)
    return NextResponse.redirect(signInUrl)
  }

  // Authenticated users on onboarding → let them through
  if (isOnboardingRoute(request)) return NextResponse.next()

  // Portal routes: require Clerk auth (personal, no org needed)
  if (isPortalRoute(request)) return NextResponse.next()

  // Admin routes: require Clerk auth (email check happens in the page/action)
  if (isAdminRoute(request)) return NextResponse.next()

  // Dashboard routes should be handled by app route logic rather than
  // blocking them based on Clerk orgId here, because orgId may not be present
  // immediately after authentication organization creation.
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Only run middleware for protected application surfaces.
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/portal/:path*',
    '/admin/:path*',
  ],
}

