import type { PrismaClient, TenantStatus } from "@prisma/client";

type ClerkOrgCheck =
  | { status: "FOUND"; clerkName: string; clerkSlug: string | null }
  | { status: "MISSING" }
  | { status: "UNKNOWN"; error: string };

export type ClerkTenantReconciliationRow = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: TenantStatus;
  clerkOrgId: string;
  clerkStatus: ClerkOrgCheck["status"];
  clerkName: string | null;
  clerkSlug: string | null;
  error: string | null;
};

export type ClerkTenantReconciliationResult = {
  ok: boolean;
  error: string | null;
  rows: ClerkTenantReconciliationRow[];
  missingActiveTenantIds: string[];
};

function clerkSecret(): string | null {
  const value = process.env.CLERK_SECRET_KEY?.trim() ?? "";
  return value.length > 0 ? value : null;
}

async function checkClerkOrg(clerkOrgId: string, secret: string): Promise<ClerkOrgCheck> {
  let response: Response;
  try {
    response = await fetch(`https://api.clerk.com/v1/organizations/${encodeURIComponent(clerkOrgId)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
  } catch (error: unknown) {
    return { status: "UNKNOWN", error: error instanceof Error ? error.message : String(error) };
  }

  if (response.status === 404) {
    return { status: "MISSING" };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { status: "UNKNOWN", error: `Clerk API ${response.status}: ${body.slice(0, 160)}` };
  }

  const payload = await response.json().catch(() => ({})) as { name?: unknown; slug?: unknown };
  return {
    status: "FOUND",
    clerkName: String(payload.name ?? ""),
    clerkSlug: payload.slug ? String(payload.slug) : null,
  };
}

export async function reconcileClerkTenants(
  prisma: PrismaClient,
): Promise<ClerkTenantReconciliationResult> {
  const secret = clerkSecret();
  if (!secret) {
    return {
      ok: false,
      error: "CLERK_SECRET_KEY is not configured",
      rows: [],
      missingActiveTenantIds: [],
    };
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      clerkOrgId: true,
      status: true,
    },
  });

  const rows: ClerkTenantReconciliationRow[] = [];
  for (const tenant of tenants) {
    const check = await checkClerkOrg(tenant.clerkOrgId, secret);
    rows.push({
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      tenantStatus: tenant.status,
      clerkOrgId: tenant.clerkOrgId,
      clerkStatus: check.status,
      clerkName: check.status === "FOUND" ? check.clerkName : null,
      clerkSlug: check.status === "FOUND" ? check.clerkSlug : null,
      error: check.status === "UNKNOWN" ? check.error : null,
    });
  }

  return {
    ok: true,
    error: null,
    rows,
    missingActiveTenantIds: rows
      .filter((row) => row.tenantStatus === "ACTIVE" && row.clerkStatus === "MISSING")
      .map((row) => row.tenantId),
  };
}

export async function suspendMissingClerkTenants(
  prisma: PrismaClient,
  tenantIds: string[],
  actorUserId: string,
): Promise<string[]> {
  const applied: string[] = [];

  for (const tenantId of tenantIds) {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: "SUSPENDED" },
      select: { id: true, name: true, slug: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId,
        action: "UPDATE",
        metadata: {
          entity: "Tenant",
          field: "status",
          to: "SUSPENDED",
          source: "clerk-tenant-reconciliation",
        },
      },
    });

    applied.push(`SUSPEND ${tenant.name} /${tenant.slug}`);
  }

  return applied;
}
