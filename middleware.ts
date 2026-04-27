import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/plugin(.*)', // Plugin API routes use API key authentication
])

const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)'])
const isPortalRoute = createRouteMatcher(['/portal(.*)'])
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, request) => {
  const { userId, orgId } = await auth()

  // Allow public routes through
  if (isPublicRoute(request)) return NextResponse.next()

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
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

