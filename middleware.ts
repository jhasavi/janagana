import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { isDashboardFeatureHidden } from '@/lib/feature-flags'
import { logAuthOrgRedirectDecision } from '@/lib/auth-org-redirect-log'

const isOnboardingRoute = (pathname: string) => pathname.startsWith('/onboarding')
const isSelectOrgRoute = (pathname: string) => pathname.startsWith('/select-organization')
const isPortalRoute = (pathname: string) => pathname.startsWith('/portal')
const isAdminRoute = (pathname: string) => pathname.startsWith('/admin')
const isPreviewRoute = (pathname: string) => pathname.startsWith('/preview')

function runtimeEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } })?.process?.env?.[name]
}

function isAppTestAuthEnabled() {
  if (runtimeEnv('NODE_ENV') === 'production') return false
  return runtimeEnv('NODE_ENV') === 'test' || runtimeEnv('PLAYWRIGHT_TEST') === 'true' || runtimeEnv('E2E_TEST_MODE') === 'true'
}

function getTestAuthIdentityFromCookieValue(value: string | undefined) {
  if (!isAppTestAuthEnabled() || !value) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as { userId?: string; email?: string }
    if (!parsed.userId || !parsed.email) return null
    return { userId: parsed.userId, email: parsed.email }
  } catch {
    return null
  }
}

async function handleTestAuthMiddleware(request: Parameters<typeof NextResponse.next>[0] extends never ? never : import('next/server').NextRequest) {
  const testIdentity = getTestAuthIdentityFromCookieValue(request.cookies.get('JG_TEST_AUTH')?.value)
  const activeOrgCookiePresent = Boolean(request.cookies.get('JG_ACTIVE_ORG')?.value)
  const selectedTenantIdPresent = Boolean(request.cookies.get('JG_TENANT_ID')?.value)

  if (!testIdentity) {
    logAuthOrgRedirectDecision({
      route: request.nextUrl.pathname,
      userPresent: false,
      membershipCount: null,
      activeOrgCookiePresent,
      selectedTenantIdPresent,
      redirectTarget: '/sign-in',
      reasonCode: 'NO_AUTH_REDIRECT_SIGNIN',
    })
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', request.url)
    return NextResponse.redirect(signInUrl)
  }

  if (isOnboardingRoute(request.nextUrl.pathname) || isSelectOrgRoute(request.nextUrl.pathname)) return NextResponse.next()
  if (isPortalRoute(request.nextUrl.pathname)) return NextResponse.next()
  if (isAdminRoute(request.nextUrl.pathname)) return NextResponse.next()

  if (isPreviewRoute(request.nextUrl.pathname) || isDashboardFeatureHidden(request.nextUrl.pathname)) {
    logAuthOrgRedirectDecision({
      route: request.nextUrl.pathname,
      userPresent: true,
      membershipCount: null,
      activeOrgCookiePresent,
      selectedTenantIdPresent,
      redirectTarget: '/dashboard',
      reasonCode: 'ONE_ORG_AUTO_SELECT_DASHBOARD',
    })
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export default async function middleware(request: import('next/server').NextRequest) {
  if (isAppTestAuthEnabled()) {
    return handleTestAuthMiddleware(request)
  }

  const runClerkMiddleware = clerkMiddleware as unknown as (
    handler: (auth: () => Promise<{ userId: string | null }>, request: import('next/server').NextRequest) => Promise<NextResponse> | NextResponse,
    options?: Record<string, never>
  ) => (request: import('next/server').NextRequest) => Promise<NextResponse> | NextResponse

  return runClerkMiddleware(async (auth, request) => {
    const { userId } = await auth()
    const activeOrgCookiePresent = Boolean(request.cookies.get('JG_ACTIVE_ORG')?.value)
    const selectedTenantIdPresent = Boolean(request.cookies.get('JG_TENANT_ID')?.value)

    if (!userId) {
      logAuthOrgRedirectDecision({
        route: request.nextUrl.pathname,
        userPresent: false,
        membershipCount: null,
        activeOrgCookiePresent,
        selectedTenantIdPresent,
        redirectTarget: '/sign-in',
        reasonCode: 'NO_AUTH_REDIRECT_SIGNIN',
      })
      const signInUrl = new URL('/sign-in', request.url)
      signInUrl.searchParams.set('redirect_url', request.url)
      return NextResponse.redirect(signInUrl)
    }

    if (isOnboardingRoute(request.nextUrl.pathname) || isSelectOrgRoute(request.nextUrl.pathname)) return NextResponse.next()
    if (isPortalRoute(request.nextUrl.pathname)) return NextResponse.next()
    if (isAdminRoute(request.nextUrl.pathname)) return NextResponse.next()

    if (isPreviewRoute(request.nextUrl.pathname) || isDashboardFeatureHidden(request.nextUrl.pathname)) {
      logAuthOrgRedirectDecision({
        route: request.nextUrl.pathname,
        userPresent: true,
        membershipCount: null,
        activeOrgCookiePresent,
        selectedTenantIdPresent,
        redirectTarget: '/dashboard',
        reasonCode: 'ONE_ORG_AUTO_SELECT_DASHBOARD',
      })
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  }, {})(request)
}

export const config = {
  matcher: [
    // Only run middleware for protected application surfaces.
    '/',
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/select-organization/:path*',
    '/api/active-org',
    '/portal/:path*',
    '/admin/:path*',
    '/preview/:path*',
  ],
}
