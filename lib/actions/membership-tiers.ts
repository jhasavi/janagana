import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { resolveTenantForDashboard } from "@/lib/tenant";

export const MembershipTierCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    amountCents: z.number().int().min(0),
    interval: z.enum(["MONTHLY", "ANNUAL", "ONE_TIME"]),
    active: z.boolean().default(true),
  })
  .strict();

async function requireActiveTenantContext() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Not authenticated" as const };
  }

  const resolution = await resolveTenantForDashboard();
  if (resolution.status !== "ONE_TENANT") {
    return { error: "No active tenant context" as const };
  }

  return { user, tenant: resolution.tenant };
}

export async function createMembershipTier(input: unknown) {
  const context = await requireActiveTenantContext();
  if ("error" in context) {
    return { ok: false as const, error: context.error };
  }

  const parsed = MembershipTierCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid tier input" };
  }

  try {
    const tier = await prisma.membershipTier.create({
      data: {
        tenantId: context.tenant.id,
        name: parsed.data.name,
        amountCents: parsed.data.amountCents,
        interval: parsed.data.interval,
        active: parsed.data.active,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: context.tenant.id,
        actorUserId: context.user.id,
        action: "CREATE",
        metadata: { entity: "MembershipTier", tierId: tier.id },
      },
    });

    return { ok: true as const, data: tier };
  } catch {
    return { ok: false as const, error: "Failed to create membership tier" };
  }
}

export async function listMembershipTiers() {
  const context = await requireActiveTenantContext();
  if ("error" in context) {
    return { ok: false as const, error: context.error, data: [] as any[] };
  }

  const tiers = await prisma.membershipTier.findMany({
    where: { tenantId: context.tenant.id },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });

  return { ok: true as const, data: tiers };
}
