"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAccessForTenant, requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";
import { isPro, UPGRADE_REQUIRED_ERROR } from "@/lib/plans/gate";

const HouseholdCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
  })
  .strict();

const HouseholdUpdateSchema = z
  .object({
    householdId: z.string().trim().min(1),
    name: z.string().trim().min(1).max(150),
    payerContactId: z.string().trim().min(1).optional().or(z.literal("")),
  })
  .strict();

const HouseholdMemberSchema = z
  .object({
    householdId: z.string().trim().min(1),
    contactId: z.string().trim().min(1),
  })
  .strict();

/** List households for the active tenant, PII-adjacent so gated like contact reads. */
export async function listHouseholds() {
  const auth = await requireAdminAccessForTenant();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: [] as any[] };
  }

  const households = await prisma.household.findMany({
    where: { tenantId: auth.context.tenant.id },
    include: {
      members: { select: { id: true, firstName: true, lastName: true, type: true } },
      payer: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { name: "asc" },
  });

  return { ok: true as const, data: households };
}

export async function getHousehold(householdId: string) {
  const auth = await requireAdminAccessForTenant();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: null };
  }

  const household = await prisma.household.findFirst({
    where: { id: householdId, tenantId: auth.context.tenant.id },
    include: {
      members: {
        select: { id: true, firstName: true, lastName: true, email: true, type: true },
        orderBy: { lastName: "asc" },
      },
      payer: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!household) {
    return { ok: false as const, error: "Household not found", data: null };
  }

  return { ok: true as const, data: household };
}

/** Contacts not yet in a household, for the "add member" picker. */
export async function listUnassignedContacts(query?: string) {
  const auth = await requireAdminAccessForTenant();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: [] as any[] };
  }

  const contacts = await prisma.contact.findMany({
    where: {
      tenantId: auth.context.tenant.id,
      householdId: null,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { lastName: "asc" },
    take: 25,
  });

  return { ok: true as const, data: contacts };
}

export async function createHousehold(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  if (!isPro(auth.context.tenant)) {
    return { ok: false as const, error: UPGRADE_REQUIRED_ERROR, upgradeRequired: true as const };
  }

  const parsed = HouseholdCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid household input" };
  }

  const household = await prisma.household.create({
    data: {
      tenantId: auth.context.tenant.id,
      name: parsed.data.name,
    },
  });

  return { ok: true as const, data: household };
}

export async function updateHousehold(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const parsed = HouseholdUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid household input" };
  }

  const existing = await prisma.household.findFirst({
    where: { id: parsed.data.householdId, tenantId: auth.context.tenant.id },
  });
  if (!existing) {
    return { ok: false as const, error: "Household not found" };
  }

  const payerContactId = parsed.data.payerContactId || null;
  if (payerContactId) {
    const payer = await prisma.contact.findFirst({
      where: { id: payerContactId, tenantId: auth.context.tenant.id, householdId: existing.id },
    });
    if (!payer) {
      return { ok: false as const, error: "Payer must already be a member of this household" };
    }
  }

  const household = await prisma.household.update({
    where: { id: existing.id },
    data: { name: parsed.data.name, payerContactId },
  });

  return { ok: true as const, data: household };
}

export async function addHouseholdMember(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  if (!isPro(auth.context.tenant)) {
    return { ok: false as const, error: UPGRADE_REQUIRED_ERROR, upgradeRequired: true as const };
  }

  const parsed = HouseholdMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [household, contact] = await Promise.all([
    prisma.household.findFirst({ where: { id: parsed.data.householdId, tenantId: auth.context.tenant.id } }),
    prisma.contact.findFirst({ where: { id: parsed.data.contactId, tenantId: auth.context.tenant.id } }),
  ]);
  if (!household) return { ok: false as const, error: "Household not found" };
  if (!contact) return { ok: false as const, error: "Contact not found" };

  await prisma.contact.update({
    where: { id: contact.id },
    data: { householdId: household.id },
  });

  return { ok: true as const };
}

export async function removeHouseholdMember(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const parsed = HouseholdMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const contact = await prisma.contact.findFirst({
    where: { id: parsed.data.contactId, tenantId: auth.context.tenant.id, householdId: parsed.data.householdId },
  });
  if (!contact) return { ok: false as const, error: "Contact is not a member of this household" };

  await prisma.$transaction([
    // Clear payer first if this contact was the payer, to avoid a dangling FK during the member removal.
    prisma.household.updateMany({
      where: { id: parsed.data.householdId, payerContactId: contact.id },
      data: { payerContactId: null },
    }),
    prisma.contact.update({ where: { id: contact.id }, data: { householdId: null } }),
  ]);

  return { ok: true as const };
}

export async function deleteHousehold(householdId: string, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const existing = await prisma.household.findFirst({
    where: { id: householdId, tenantId: auth.context.tenant.id },
  });
  if (!existing) {
    return { ok: false as const, error: "Household not found" };
  }

  await prisma.household.delete({ where: { id: existing.id } });
  return { ok: true as const };
}
