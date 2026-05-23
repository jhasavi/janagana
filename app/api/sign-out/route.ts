import { type NextRequest, NextResponse } from 'next/server'
import { logAuthOrgRedirectDecision } from '@/lib/auth-org-redirect-log'
import { clearActiveOrgCookies } from '@/lib/auth/auth-provider'

/**
 * GET /api/sign-out
 *
 * Clears all app-side session cookies (JG_ACTIVE_ORG, JG_TENANT_ID) after
 * Clerk has completed its own sign-out. Clerk's UserButton is configured with
 * afterSignOutUrl="/api/sign-out" so the browser lands here post sign-out,
 * then we redirect to /sign-in.
 *
 * This route is intentionally unauthenticated-accessible — the user is already
 * signed out of Clerk when they arrive here.
 */
export async function GET(request: NextRequest) {
  // Build an absolute /sign-in URL from the incoming request origin so this
  // works in all environments (local, staging, production) without relying on
  // env vars that may not be present during testing.
  const origin = request.nextUrl.origin
  const redirectResponse = NextResponse.redirect(`${origin}/sign-in`)

  await clearActiveOrgCookies(redirectResponse)

  logAuthOrgRedirectDecision({
    route: '/api/sign-out',
    userPresent: false,
    membershipCount: null,
    activeOrgCookiePresent: true,
    selectedTenantIdPresent: true,
    redirectTarget: '/sign-in',
    reasonCode: 'LOGOUT_CLEAR_COOKIES',
  })

  return redirectResponse
}
