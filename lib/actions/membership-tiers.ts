import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantForActions, type TenantActionOptions } from "@/lib/tenant";
import { issueReceiptForPayment } from "@/lib/payments/receipts";

const MembershipStatusSchema = z.enum(["PENDING", "ACTIVE", "INACTIVE", "EXPIRED", "CANCELED"]);
const PaymentStatusSchema = z.enum(["PENDING", "PAID", "FAILED", "REFUNDED", "WAIVED"]);
const PaymentMethodSchema = z.enum(["OFFLINE", "CASH", "CHECK", "CARD", "BANK_TRANSFER", "STRIPE", "OTHER"]);

export const MembershipTierCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    amountCents: z.number().int().min(0),
    interval: z.enum(["MONTHLY", "ANNUAL", "ONE_TIME"]),
    active: z.boolean().default(true),
  })
  .strict();

export async function createMembershipTier(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
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
        description: parsed.data.description || null,
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

export const MembershipEnrollSchema = z
  .object({
    contactId: z.string().trim().min(1),
    tierId: z.string().trim().min(1),
    status: MembershipStatusSchema.default("ACTIVE"),
    startsAt: z.coerce.date(),
    expiresAt: z.coerce.date().optional().nullable(),
    autoRenew: z.boolean().default(false),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    initialPaymentAmountCents: z.number().int().min(0).optional(),
    initialPaymentMethod: PaymentMethodSchema.default("OFFLINE"),
    initialPaymentStatus: PaymentStatusSchema.default("PAID"),
    initialPaymentPaidAt: z.coerce.date().optional().nullable(),
    initialPaymentNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .strict();

export const MembershipPaymentCreateSchema = z
  .object({
    membershipId: z.string().trim().min(1),
    amountCents: z.number().int().min(0),
    method: PaymentMethodSchema.default("OFFLINE"),
    status: PaymentStatusSchema.default("PAID"),
    paidAt: z.coerce.date().optional().nullable(),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    providerRef: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .strict();

export const MembershipStatusUpdateSchema = z
  .object({
    membershipId: z.string().trim().min(1),
    status: MembershipStatusSchema,
  })
  .strict();

function addInterval(date: Date, interval: "MONTHLY" | "ANNUAL" | "ONE_TIME") {
  if (interval === "ONE_TIME") return null;
  const next = new Date(date);
  if (interval === "MONTHLY") next.setMonth(next.getMonth() + 1);
  if (interval === "ANNUAL") next.setFullYear(next.getFullYear() + 1);
  return next;
}

function normalizeDate(value: Date | null | undefined) {
  if (!value) return null;
  if (Number.isNaN(value.getTime())) return null;
  return value;
}

export async function listMembershipAdminData() {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return {
      ok: false as const,
      error: auth.error,
      data: null as any,
    };
  }
  const context = auth.context;
  const now = new Date();
  const expiringBefore = new Date(now);
  expiringBefore.setDate(expiringBefore.getDate() + 30);

  const [tiers, contacts, memberships, paidRows, pendingRows] = await Promise.all([
    prisma.membershipTier.findMany({
      where: { tenantId: context.tenant.id },
      include: { _count: { select: { memberships: true } } },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }, { name: "asc" }],
    }),
    prisma.contact.findMany({
      where: { tenantId: context.tenant.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        type: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { email: "asc" }],
      take: 500,
    }),
    prisma.membership.findMany({
      where: { tenantId: context.tenant.id },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        tier: {
          select: { id: true, name: true, amountCents: true, interval: true },
        },
        payments: {
          orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
          include: {
            receipt: {
              select: {
                receiptNumber: true,
                issuedAt: true,
              },
            },
          },
          take: 5,
        },
      },
      orderBy: [{ status: "asc" }, { expiresAt: "asc" }, { createdAt: "desc" }],
    }),
    prisma.paymentRecord.findMany({
      where: { tenantId: context.tenant.id, purpose: "MEMBERSHIP", status: "PAID" },
      select: { amountCents: true },
    }),
    prisma.paymentRecord.findMany({
      where: { tenantId: context.tenant.id, purpose: "MEMBERSHIP", status: "PENDING" },
      select: { amountCents: true },
    }),
  ]);

  const activeMemberships = memberships.filter((membership) => membership.status === "ACTIVE");
  const expiringSoon = activeMemberships.filter(
    (membership) => membership.expiresAt && membership.expiresAt >= now && membership.expiresAt <= expiringBefore,
  );
  const expired = memberships.filter(
    (membership) => membership.status === "EXPIRED" || (membership.expiresAt && membership.expiresAt < now),
  );
  const collectedCents = paidRows.reduce((sum, row) => sum + row.amountCents, 0);
  const pendingCents = pendingRows.reduce((sum, row) => sum + row.amountCents, 0);

  return {
    ok: true as const,
    data: {
      tiers,
      contacts,
      memberships,
      summary: {
        activeMemberships: activeMemberships.length,
        expiringSoon: expiringSoon.length,
        expired: expired.length,
        collectedCents,
        pendingCents,
      },
    },
  };
}

export async function enrollMembership(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  const parsed = MembershipEnrollSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid membership input" };
  }

  const [contact, tier] = await Promise.all([
    prisma.contact.findFirst({ where: { id: parsed.data.contactId, tenantId: context.tenant.id } }),
    prisma.membershipTier.findFirst({ where: { id: parsed.data.tierId, tenantId: context.tenant.id } }),
  ]);

  if (!contact) return { ok: false as const, error: "Contact not found" };
  if (!tier) return { ok: false as const, error: "Membership tier not found" };

  const startsAt = parsed.data.startsAt;
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false as const, error: "Start date is invalid" };
  }

  const expiresAt = normalizeDate(parsed.data.expiresAt) ?? addInterval(startsAt, tier.interval);
  const paidAt = normalizeDate(parsed.data.initialPaymentPaidAt) ?? new Date();
  const paymentAmount = parsed.data.initialPaymentAmountCents ?? 0;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          tenantId: context.tenant.id,
          contactId: contact.id,
          tierId: tier.id,
          status: parsed.data.status,
          startsAt,
          expiresAt,
          autoRenew: parsed.data.autoRenew,
          notes: parsed.data.notes || null,
          source: "admin",
        },
      });

      await tx.contact.update({
        where: { id: contact.id },
        data: {
          type: "MEMBER",
          lastActivityAt: new Date(),
          lastActivitySummary: `Enrolled in ${tier.name}`,
        },
      });

      const payment =
        paymentAmount > 0
          ? await tx.paymentRecord.create({
              data: {
                tenantId: context.tenant.id,
                contactId: contact.id,
                membershipId: membership.id,
                amountCents: paymentAmount,
                status: parsed.data.initialPaymentStatus,
                method: parsed.data.initialPaymentMethod,
                purpose: "MEMBERSHIP",
                paidAt,
                notes: parsed.data.initialPaymentNotes || null,
              },
            })
          : null;

      return { membership, payment };
    });

    await prisma.auditLog.create({
      data: {
        tenantId: context.tenant.id,
        actorUserId: context.user.id,
        action: "CREATE",
        metadata: {
          entity: "Membership",
          membershipId: result.membership.id,
          contactId: contact.id,
          tierId: tier.id,
          paymentId: result.payment?.id ?? null,
        },
      },
    });

    if (result.payment?.id) {
      await issueReceiptForPayment(result.payment.id);
    }

    return { ok: true as const, data: result.membership };
  } catch {
    return { ok: false as const, error: "Failed to enroll membership" };
  }
}

export async function recordMembershipPayment(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  const parsed = MembershipPaymentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid payment input" };
  }

  const membership = await prisma.membership.findFirst({
    where: { id: parsed.data.membershipId, tenantId: context.tenant.id },
    select: { id: true, contactId: true },
  });
  if (!membership) {
    return { ok: false as const, error: "Membership not found" };
  }

  const paidAt = normalizeDate(parsed.data.paidAt) ?? new Date();

  try {
    const payment = await prisma.paymentRecord.create({
      data: {
        tenantId: context.tenant.id,
        contactId: membership.contactId,
        membershipId: membership.id,
        amountCents: parsed.data.amountCents,
        method: parsed.data.method,
        status: parsed.data.status,
        purpose: "MEMBERSHIP",
        paidAt,
        providerRef: parsed.data.providerRef || null,
        notes: parsed.data.notes || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: context.tenant.id,
        actorUserId: context.user.id,
        action: "CREATE",
        metadata: {
          entity: "PaymentRecord",
          paymentId: payment.id,
          membershipId: membership.id,
        },
      },
    });

    await issueReceiptForPayment(payment.id);

    return { ok: true as const, data: payment };
  } catch {
    return { ok: false as const, error: "Failed to record payment" };
  }
}

export async function updateMembershipStatus(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  const parsed = MembershipStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid status input" };
  }

  const existing = await prisma.membership.findFirst({
    where: { id: parsed.data.membershipId, tenantId: context.tenant.id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return { ok: false as const, error: "Membership not found" };
  }

  const membership = await prisma.membership.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "UPDATE",
      metadata: {
        entity: "Membership",
        membershipId: membership.id,
        fromStatus: existing.status,
        toStatus: membership.status,
      },
    },
  });

  return { ok: true as const, data: membership };
}
