import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// ─── Route classifiers ────────────────────────────────────────────────────────

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/member-login(.*)',
  '/events/public(.*)',
  '/api/webhooks(.*)',
  '/(.*)/events',
  '/(.*)/join',
  '/(.*)/donate',
  '/health(.*)',
]);

const isDashboardRoute = createRouteMatcher(['/dashboard(.*)']);
const isPortalRoute = createRouteMatcher(['/portal(.*)']);
const isBillingRoute = createRouteMatcher(['/billing(.*)']);

// ─── Reserved subdomains (never treated as tenant slugs) ─────────────────────

const RESERVED = new Set(['www', 'app', 'api', 'localhost', 'mail', 'admin']);

// ─── Tenant resolution from hostname (with error handling) ─────────────────

function resolveTenantSlug(host: string): { slug: string | null; isCustomDomain: boolean } {
  try {
    const hostname = host.split(':')[0].toLowerCase();
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'namasteneedham.com';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost';

    // Subdomain of the app domain: acme.namasteneedham.com
    if (hostname.endsWith(`.${appDomain}`)) {
      const slug = hostname.slice(0, -(appDomain.length + 1));
      if (slug && !RESERVED.has(slug)) return { slug, isCustomDomain: false };
    }

    // Subdomain of the root dev domain: acme.localhost
    if (hostname.endsWith(`.${rootDomain}`)) {
      const slug = hostname.slice(0, -(rootDomain.length + 1));
      if (slug && !RESERVED.has(slug)) return { slug, isCustomDomain: false };
    }

    // Custom domain: completely different hostname that is not the app or root domain
    if (hostname !== appDomain && hostname !== rootDomain && !hostname.endsWith(`.${appDomain}`)) {
      return { slug: null, isCustomDomain: true };
    }

    return { slug: null, isCustomDomain: false };
  } catch (error) {
    console.error('Error resolving tenant slug:', error);
    return { slug: null, isCustomDomain: false };
  }
}

// ─── Path-based tenant for localhost dev: /acme/dashboard -> tenant=acme ────

function resolveTenantFromPath(pathname: string): { slug: string; strippedPath: string } | null {
  try {
    if (process.env.NODE_ENV !== 'development') return null;

    const match = pathname.match(/^\/([a-z0-9-]+)(\/.*)?$/);
    if (!match) return null;
    const candidate = match[1];
    const reserved = new Set(['sign-in', 'sign-up', 'member-login', 'api', '_next', 'events', 'favicon.ico', 'health']);
    if (reserved.has(candidate)) return null;
    return { slug: candidate, strippedPath: match[2] ?? '/' };
  } catch (error) {
    console.error('Error resolving tenant from path:', error);
    return null;
  }
}

// ─── Clerk-wrapped middleware (with error handling) ─────────────────────────

export default clerkMiddleware((auth, request: NextRequest) => {
  try {
    const { pathname } = request.nextUrl;
    const host = request.headers.get('host') ?? '';

    // ── 1. Resolve tenant (with fallback) ────────────────────────────────────
    const { slug: subdomainSlug, isCustomDomain } = resolveTenantSlug(host);
    const pathResolution = !subdomainSlug ? resolveTenantFromPath(pathname) : null;

    const tenantSlug =
      subdomainSlug ??
      pathResolution?.slug ??
      process.env.NEXT_PUBLIC_TENANT_FALLBACK ??
      null;

    // ── 2. Build forwarded headers ───────────────────────────────────────────
    const requestHeaders = new Headers(request.headers);
    if (tenantSlug) requestHeaders.set('x-tenant-slug', tenantSlug);
    if (isCustomDomain) requestHeaders.set('x-tenant-custom-domain', host.split(':')[0]);
    requestHeaders.set('x-pathname', pathname);

    // ── 3. Path rewrite for dev path-based routing ───────────────────────────
    if (pathResolution) {
      const rewritten = request.nextUrl.clone();
      rewritten.pathname = pathResolution.strippedPath;
      return NextResponse.rewrite(rewritten, { request: { headers: requestHeaders } });
    }

    // ── 4. Public routes: allow through without auth check ───────────────────
    if (isPublicRoute(request)) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // auth() is synchronous in clerkMiddleware — call once, reuse.
    const authObj = auth();
    const { userId, sessionClaims } = authObj;
    const role = (sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as string | undefined;

    // ── 5. Unauthenticated — redirect to sign-in ─────────────────────────────
    if (!userId) {
      const signInUrl = request.nextUrl.clone();
      signInUrl.pathname = '/sign-in';
      return NextResponse.redirect(signInUrl);
    }

    // ── 6. Protect dashboard routes (admin users only) ───────────────────────
    if (isDashboardRoute(request)) {
      if (role !== 'admin' && role !== 'owner') {
        const url = request.nextUrl.clone();
        url.pathname = '/sign-in';
        return NextResponse.redirect(url);
      }

      // ── 7. Check subscription status (trial expired or no active subscription) ─
      const subscriptionStatus = (sessionClaims?.metadata as Record<string, unknown> | undefined)?.subscriptionStatus as string | undefined;
      const trialExpired = (sessionClaims?.metadata as Record<string, unknown> | undefined)?.trialExpired as boolean | undefined;

      if (!isBillingRoute(request)) {
        if (subscriptionStatus === 'PAST_DUE' || trialExpired === true) {
          const billingUrl = request.nextUrl.clone();
          billingUrl.pathname = '/billing';
          billingUrl.searchParams.set('trial_ended', 'true');
          return NextResponse.redirect(billingUrl);
        }
      }
    }

    // ── 8. Protect portal routes (member users) ─────────────────────────────
    if (isPortalRoute(request)) {
      if (role === 'admin' || role === 'owner') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    console.error('Middleware error:', error);
    // On any error, continue without tenant context rather than 500
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
