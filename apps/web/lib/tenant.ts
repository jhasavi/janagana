import { headers } from 'next/headers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  timezone: string;
  isActive: boolean;
}

export interface TenantResolutionResult {
  tenant: TenantContext | null;
  slug: string | null;
  isCustomDomain: boolean;
}

// ─── Header helpers (server-side) ────────────────────────────────────────────

/**
 * Read the tenant slug injected by the middleware via request headers.
 * Call this from Server Components or Route Handlers (never from Client Components).
 */
export function getTenantSlugFromHeaders(): string | null {
  const headerStore = headers();
  return headerStore.get('x-tenant-slug');
}

/**
 * Read the raw custom domain injected by middleware when subdomain resolution
 * failed and the host looked like a custom domain.
 */
export function getCustomDomainFromHeaders(): string | null {
  const headerStore = headers();
  return headerStore.get('x-tenant-custom-domain');
}

// ─── Subdomain extractor (edge-safe, no DB) ───────────────────────────────────

const RESERVED = new Set(['www', 'app', 'api', 'localhost', 'mail', 'admin']);

/**
 * Extract a tenant slug from a hostname string.
 * Works at the edge without any database access.
 *
 * @example
 * getTenantFromSubdomain('acme.orgflow.app', 'orgflow.app') // 'acme'
 * getTenantFromSubdomain('acme.localhost', 'localhost')      // 'acme'
 * getTenantFromSubdomain('orgflow.app', 'orgflow.app')       // null
 */
export function getTenantFromSubdomain(host: string, appDomain?: string): string | null {
  const hostname = host.split(':')[0].toLowerCase();
  const domain = appDomain ?? process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'orgflow.app';

  if (hostname.endsWith(`.${domain}`)) {
    const slug = hostname.slice(0, -(domain.length + 1));
    if (slug && !RESERVED.has(slug)) return slug;
  }
  return null;
}

// ─── DB-backed lookups ────────────────────────────────────────────────────────

/**
 * Look up a tenant by its slug in the database.
 * Returns null when the tenant doesn't exist or is deactivated.
 *
 * NOTE: Import prisma lazily so this module remains edge-compatible when used
 * in middleware (where prisma cannot run). The DB lookups are only called from
 * Server Components and Route Handlers that run in the Node.js runtime.
 */
export async function getTenantBySlug(slug: string): Promise<TenantContext | null> {
  // Dynamic import keeps the edge runtime happy – prisma is excluded from the
  // middleware bundle because middleware.ts never calls this function.
  const { prisma } = await import('@orgflow/database');

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      domain: true,
      logoUrl: true,
      primaryColor: true,
      timezone: true,
      isActive: true,
    },
  });

  if (!tenant || !tenant.isActive) return null;
  return tenant;
}

/**
 * Look up a tenant by its custom domain in the database.
 */
export async function getTenantByDomain(domain: string): Promise<TenantContext | null> {
  const { prisma } = await import('@orgflow/database');

  const tenant = await prisma.tenant.findUnique({
    where: { domain },
    select: {
      id: true,
      slug: true,
      name: true,
      domain: true,
      logoUrl: true,
      primaryColor: true,
      timezone: true,
      isActive: true,
    },
  });

  if (!tenant || !tenant.isActive) return null;
  return tenant;
}

// ─── Unified resolver ─────────────────────────────────────────────────────────

/**
 * High-level function to resolve the current tenant from Next.js request headers.
 * Use this inside Server Components and `generateMetadata`.
 *
 * Resolution order:
 * 1. `x-tenant-slug`   – set when subdomain or path-based routing matched
 * 2. `x-tenant-custom-domain` – set for custom domains; triggers DB lookup
 */
export async function getCurrentTenant(): Promise<TenantContext | null> {
  const slug = getTenantSlugFromHeaders();
  if (slug) return getTenantBySlug(slug);

  const customDomain = getCustomDomainFromHeaders();
  if (customDomain) return getTenantByDomain(customDomain);

  return null;
}
