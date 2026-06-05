"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
import { isClerkOrgAdminRole } from "@/lib/auth/clerk-roles";
import { prisma } from "@/lib/prisma";
import { preferredPublicSlug } from "@/lib/ops/tenant-slug-repair";
import { setActiveTenantCookie } from "@/lib/tenant";

// Feature flag to keep existing org mapping disabled by default in production
// and enable it only for controlled troubleshooting.
const existingOrgSetupEnabled = process.env.ENABLE_EXISTING_ORG_SETUP === "true";

function shortId(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

async function makeUniqueTenantSlug(candidate: string): Promise<string> {
  const baseSlug = candidate.slice(0, 60) || "organization";
  let slug = baseSlug;
  let suffix = 0;

  while (true) {
    const existing = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
      return slug;
    }

    suffix += 1;
    const suffixText = `-${suffix}`;
    const maxBaseLength = 60 - suffixText.length;
    slug = `${baseSlug.slice(0, maxBaseLength)}${suffixText}`;
  }
}

function isClaimablePlaceholderClerkOrgId(clerkOrgId: string): boolean {
  return clerkOrgId.startsWith("e2e_") || clerkOrgId.startsWith("local_demo_");
}

export async function findClaimablePlaceholderTenant(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      clerkOrgId: true,
      status: true,
      _count: {
        select: {
          tenantAdmins: true,
        },
      },
    },
  });

  if (
    tenant &&
    tenant.status === "ACTIVE" &&
    tenant._count.tenantAdmins === 0 &&
    isClaimablePlaceholderClerkOrgId(tenant.clerkOrgId)
  ) {
    return tenant;
  }

  return null;
}

export async function setupExistingClerkOrgAsTenant(clerkOrgId: string) {
  const current = await getCurrentUser();
  if (!current) {
    console.info("DASHBOARD_TENANT_FAILED", { reason: "NO_AUTH" });
    redirect("/sign-in");
  }

  const requestedClerkOrgId = String(clerkOrgId ?? "").trim();
  if (!requestedClerkOrgId) {
    redirect("/onboarding/create-organization?error=invalid-clerk-org");
  }

  if (!existingOrgSetupEnabled) {
    console.info("SETUP_EXISTING_ORG_DISABLED", {
      userId: shortId(current.id),
      requestedClerkOrgId: shortId(requestedClerkOrgId),
    });
    throw new Response("Existing organization setup is temporarily disabled", { status: 403 });
  }

  const memberships = await getUserClerkOrganizations();
  console.info("SETUP_EXISTING_ORG_SUBMIT", {
    userId: shortId(current.id),
    clerkMembershipCount: memberships.length,
    requestedClerkOrgId: shortId(requestedClerkOrgId),
  });

  const membership = memberships.find((org) => org.clerkOrgId === requestedClerkOrgId);
  if (!membership) {
    console.info("DASHBOARD_TENANT_FAILED", {
      reason: "NOT_A_MEMBER",
      requestedClerkOrgId: shortId(requestedClerkOrgId),
    });
    redirect("/onboarding/create-organization?error=not-a-member");
  }

  if (!isClerkOrgAdminRole(membership.role)) {
    console.info("DASHBOARD_TENANT_FAILED", {
      reason: "INSUFFICIENT_ORG_ROLE",
      requestedClerkOrgId: shortId(requestedClerkOrgId),
      clerkRole: membership.role,
    });
    redirect("/onboarding/create-organization?error=insufficient-permission");
  }

  const existingTenant = await prisma.tenant.findUnique({
    where: { clerkOrgId: requestedClerkOrgId },
    select: { id: true },
  });
  if (existingTenant) {
    console.info("DASHBOARD_TENANT_FAILED", {
      reason: "TENANT_ALREADY_MAPPED",
      clerkOrgId: shortId(requestedClerkOrgId),
    });
    redirect("/onboarding/create-organization?error=tenant-already-mapped");
  }

  const preferredSlug = preferredPublicSlug(membership.name, membership.slug);
  const claimableTenant = await findClaimablePlaceholderTenant(preferredSlug);
  const tenantSlug = claimableTenant ? claimableTenant.slug : await makeUniqueTenantSlug(preferredSlug);

  try {
    const tenant = claimableTenant
      ? await prisma.tenant.update({
          where: { id: claimableTenant.id },
          data: {
            name: membership.name,
            clerkOrgId: requestedClerkOrgId,
            tenantAdmins: {
              create: {
                clerkUserId: current.id,
                role: "owner",
              },
            },
          },
        })
      : await prisma.tenant.create({
          data: {
            name: membership.name,
            slug: tenantSlug,
            clerkOrgId: requestedClerkOrgId,
            tenantAdmins: {
              create: {
                clerkUserId: current.id,
                role: "owner",
              },
            },
          },
        });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: current.id,
        action: "CREATE",
        metadata: { entity: "Tenant", source: "setup_existing_clerk_org" },
      },
    });

    console.info("CREATED_TENANT", {
      reason: "CREATED_TENANT",
      source: "setup-existing-clerk-org",
      clerkOrgId: shortId(requestedClerkOrgId),
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      claimedPlaceholder: Boolean(claimableTenant),
    });

    await setActiveTenantCookie(tenant.id);
    console.info("SET_ACTIVE_TENANT", { reason: "SET_ACTIVE_TENANT", tenantId: tenant.id, source: "setup-existing-clerk-org" });
    redirect(`/onboarding/complete?tenantId=${encodeURIComponent(tenant.id)}&source=existing`);
  } catch (error: any) {
    if (String(error?.message ?? "") === "SLUG_EXISTS") {
      console.info("DASHBOARD_TENANT_FAILED", {
        reason: "SLUG_EXISTS",
        clerkOrgId: shortId(requestedClerkOrgId),
      });
      redirect("/onboarding/create-organization?error=slug-exists");
    }
    if (String(error?.message ?? "").includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.info("DASHBOARD_TENANT_FAILED", {
      reason: "SETUP_EXISTING_FAILED",
      userId: shortId(current.id),
      clerkOrgId: shortId(requestedClerkOrgId),
      errorCode: error?.code ?? "unknown",
      message: error?.message ?? "unknown",
    });
    redirect("/onboarding/create-organization?error=setup-existing-failed");
  }
}
