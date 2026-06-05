import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantForActions } from "@/lib/tenant";

export const MembershipTierCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    amountCents: z.number().int().min(0),
    interval: z.enum(["MONTHLY", "ANNUAL", "ONE_TIME"]),
    active: z.boolean().default(true),
  })
  .strict();

export async function createMembershipTier(input: unknown) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

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
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: [] as any[] };
  }
  const context = auth.context;

  const tiers = await prisma.membershipTier.findMany({
    where: { tenantId: context.tenant.id },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });

  return { ok: true as const, data: tiers };
}
