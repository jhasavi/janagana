import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantForActions, requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";

const CODE_RE = /^[A-Z0-9-]+$/;

export const ReferralCodeCreateSchema = z
  .object({
    code: z.string().trim().toUpperCase().min(3).max(40).regex(CODE_RE, "Use letters, numbers, and dashes only"),
    label: z.string().trim().max(200).optional().or(z.literal("")),
    ownerEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  })
  .strict();

export const ReferralCodeArchiveSchema = z
  .object({
    referralCodeId: z.string().trim().min(1),
  })
  .strict();

async function resolveOwnerContactId(tenantId: string, ownerEmailInput: string | undefined) {
  if (!ownerEmailInput) return { ok: true as const, ownerContactId: null };
  const email = ownerEmailInput.toLowerCase();
  const contact = await prisma.contact.findUnique({
    where: { tenantId_email: { tenantId, email } },
    select: { id: true },
  });
  if (!contact) return { ok: false as const, error: "No contact found with that email — add them first" };
  return { ok: true as const, ownerContactId: contact.id };
}

export async function createReferralCode(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const context = auth.context;

  const parsed = ReferralCodeCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid referral code input" };
  }

  const ownerResolution = await resolveOwnerContactId(context.tenant.id, parsed.data.ownerEmail || undefined);
  if (!ownerResolution.ok) return ownerResolution;

  try {
    const referralCode = await prisma.referralCode.create({
      data: {
        tenantId: context.tenant.id,
        code: parsed.data.code,
        label: parsed.data.label || null,
        ownerContactId: ownerResolution.ownerContactId,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: context.tenant.id,
        actorUserId: context.user.id,
        action: "CREATE",
        metadata: { entity: "ReferralCode", referralCodeId: referralCode.id, code: referralCode.code },
      },
    });

    return { ok: true as const, data: referralCode };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { ok: false as const, error: "A referral code with that value already exists for this tenant" };
    }
    return { ok: false as const, error: "Failed to create referral code" };
  }
}

export async function archiveReferralCode(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const context = auth.context;

  const parsed = ReferralCodeArchiveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.referralCode.findFirst({
    where: { id: parsed.data.referralCodeId, tenantId: context.tenant.id },
    select: { id: true },
  });
  if (!existing) return { ok: false as const, error: "Referral code not found" };

  await prisma.referralCode.update({
    where: { id: existing.id },
    data: { active: false, archivedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "UPDATE",
      metadata: { entity: "ReferralCode", referralCodeId: existing.id, change: "archived" },
    },
  });

  return { ok: true as const };
}

export async function listReferralCodes() {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) return { ok: false as const, error: auth.error, data: [] as any[] };
  const context = auth.context;

  const codes = await prisma.referralCode.findMany({
    where: { tenantId: context.tenant.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      redemptions: { select: { id: true, converted: true } },
    },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });

  const data = codes.map((referralCode) => ({
    ...referralCode,
    redemptionCount: referralCode.redemptions.length,
    convertedCount: referralCode.redemptions.filter((r) => r.converted).length,
  }));

  return { ok: true as const, data };
}

export async function getReferralCodeDetail(referralCodeId: string) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) return { ok: false as const, error: auth.error, data: null as any };
  const context = auth.context;

  const referralCode = await prisma.referralCode.findFirst({
    where: { id: referralCodeId, tenantId: context.tenant.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      redemptions: {
        include: { contact: { select: { id: true, firstName: true, lastName: true, email: true, type: true } } },
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });
  if (!referralCode) return { ok: false as const, error: "Referral code not found", data: null as any };

  return {
    ok: true as const,
    data: {
      ...referralCode,
      redemptionCount: referralCode.redemptions.length,
      convertedCount: referralCode.redemptions.filter((r) => r.converted).length,
    },
  };
}

/**
 * Public-safe lookup used during contact capture — no auth, tenant-scoped by
 * slug already resolved by the caller. Returns null for unknown/inactive codes
 * so a bad/expired ?ref= link silently degrades to "no attribution" rather than
 * blocking the visitor's signup.
 */
export async function resolveActiveReferralCode(tenantId: string, code: string) {
  return prisma.referralCode.findFirst({
    where: { tenantId, code, active: true },
    select: { id: true, code: true },
  });
}

/**
 * Records first-touch referral attribution for a newly created contact.
 * Idempotent-safe: contactId is unique on ReferralRedemption, so a duplicate
 * call (e.g. a retried request) is swallowed rather than thrown.
 */
export async function recordReferralRedemption(tenantId: string, referralCodeId: string, contactId: string) {
  try {
    await prisma.referralRedemption.create({
      data: { tenantId, referralCodeId, contactId },
    });
  } catch (error: any) {
    if (error?.code !== "P2002") throw error;
  }
}
