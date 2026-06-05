import type { TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserClerkOrganizations } from "@/lib/auth/clerk-orgs";
import {
  getActiveTenantCookie,
} from "@/lib/tenant/active-tenant-cookie";

export type MappedTenant = {
  id: string;
  name: string;
  slug: string;
  clerkOrgId: string;
  status: TenantStatus;
};

export type TenantResolutionSource = "active-cookie" | "single-tenant";

export type TenantResolutionResult =
  | { status: "ZERO_TENANTS"; staleCookieIgnored: boolean }
  | {
      status: "ONE_TENANT";
      tenant: MappedTenant;
      staleCookieIgnored: boolean;
      source: TenantResolutionSource;
    }
  | { status: "MULTI_TENANT"; tenants: MappedTenant[]; staleCookieIgnored: boolean };

export async function findMappedTenantsForUser(): Promise<MappedTenant[]> {
  const orgs = await getUserClerkOrganizations();
  if (orgs.length === 0) {
    return [];
  }

  const clerkOrgIds = orgs.map((org) => org.clerkOrgId);
  const tenants = await prisma.tenant.findMany({
    where: {
      clerkOrgId: { in: clerkOrgIds },
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      clerkOrgId: true,
      status: true,
    },
    orderBy: { name: "asc" },
  });

  return tenants;
}

export async function validateActiveTenantCookie(
  mappedTenants: MappedTenant[]
): Promise<{ tenant: MappedTenant | null; staleCookieIgnored: boolean }> {
  const cookieTenantId = await getActiveTenantCookie();
  if (!cookieTenantId) {
    return { tenant: null, staleCookieIgnored: false };
  }

  const tenant = mappedTenants.find((item) => item.id === cookieTenantId) ?? null;
  if (!tenant) {
    console.info("STALE_TENANT_COOKIE_IGNORED", {
      reason: "cookie-not-in-mapped-tenants",
      strategy: "ignored-until-route-clear",
    });
    return { tenant: null, staleCookieIgnored: true };
  }

  return { tenant, staleCookieIgnored: false };
}

export async function resolveTenantForDashboard(): Promise<TenantResolutionResult> {
  const mappedTenants = await findMappedTenantsForUser();
  const cookieCheck = await validateActiveTenantCookie(mappedTenants);

  if (mappedTenants.length === 0) {
    console.info("DASHBOARD_TENANT_FAILED", { reason: "ZERO_TENANTS_ONBOARDING" });
    return { status: "ZERO_TENANTS", staleCookieIgnored: cookieCheck.staleCookieIgnored };
  }

  if (cookieCheck.tenant) {
    console.info("DASHBOARD_TENANT_RESOLVED", {
      source: "active-cookie",
      tenantId: cookieCheck.tenant.id,
    });
    return {
      status: "ONE_TENANT",
      tenant: cookieCheck.tenant,
      staleCookieIgnored: cookieCheck.staleCookieIgnored,
      source: "active-cookie",
    };
  }

  if (mappedTenants.length === 1) {
    console.info("DASHBOARD_TENANT_RESOLVED", {
      source: "single-tenant",
      tenantId: mappedTenants[0].id,
    });
    return {
      status: "ONE_TENANT",
      tenant: mappedTenants[0],
      staleCookieIgnored: cookieCheck.staleCookieIgnored,
      source: "single-tenant",
    };
  }

  console.info("DASHBOARD_TENANT_FAILED", {
    reason: "MULTI_TENANT_REQUIRES_SELECTION",
    tenantCount: mappedTenants.length,
  });

  return {
    status: "MULTI_TENANT",
    tenants: mappedTenants,
    staleCookieIgnored: cookieCheck.staleCookieIgnored,
  };
}
