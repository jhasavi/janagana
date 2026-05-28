"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, getUserClerkOrganizations } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { preferredPublicSlug } from "@/lib/ops/tenant-slug-repair";
import { setActiveTenantCookie } from "@/lib/tenant";

function shortId(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

async function makeUniqueTenantSlug(candidate: string): Promise<string> {
  const baseSlug = candidate.slice(0, 60) || "organization";
  const existing = await prisma.tenant.findUnique({ where: { slug: baseSlug }, select: { id: true } });
  if (existing) {
    throw new Error("SLUG_EXISTS");
  }
  return baseSlug;
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

  const tenantSlug = await makeUniqueTenantSlug(
    preferredPublicSlug(membership.name, membership.slug),
  );

  try {
    const tenant = await prisma.tenant.create({
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
    });

    await setActiveTenantCookie(tenant.id);
    console.info("SET_ACTIVE_TENANT", { reason: "SET_ACTIVE_TENANT", tenantId: tenant.id, source: "setup-existing-clerk-org" });
    redirect("/dashboard");
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
