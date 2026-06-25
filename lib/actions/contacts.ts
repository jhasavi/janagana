import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantForActions, type TenantActionOptions } from "@/lib/tenant";

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12);
  }

  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export const ContactCreateSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    type: z.enum(["MEMBER", "REGISTRANT", "VOLUNTEER", "DONOR", "OTHER"]).default("OTHER"),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    tags: z.unknown().optional(),
  })
  .strict();

export const ContactUpdateSchema = z
  .object({
    contactId: z.string().trim().min(1),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    type: z.enum(["MEMBER", "REGISTRANT", "VOLUNTEER", "DONOR", "OTHER"]),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    tags: z.unknown().optional(),
  })
  .strict();

export const ContactListSchema = z
  .object({
    q: z.string().trim().max(120).optional().or(z.literal("")),
    source: z.string().trim().max(80).optional().or(z.literal("")),
    interestType: z.string().trim().max(80).optional().or(z.literal("")),
  })
  .strict();

/** Cap list payload — large imports (200+ rows) exceed RSC limits with inline edit forms. */
export const CONTACT_LIST_PAGE_SIZE = 100;

export async function createContact(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  const parsed = ContactCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid contact input" };
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        tenantId: context.tenant.id,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone || null,
        type: parsed.data.type,
        source: "manual_admin",
        interestType: parsed.data.type === "REGISTRANT" ? "EVENT_REGISTRATION" : "MANUAL",
        lastActivityAt: new Date(),
        lastActivitySummary: "Manual entry by admin",
        notes: parsed.data.notes || null,
        tags: parseTags(parsed.data.tags).length
          ? parseTags(parsed.data.tags)
          : ["manual-entry"],
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: context.tenant.id,
        actorUserId: context.user.id,
        action: "CREATE",
        metadata: { entity: "Contact", contactId: contact.id },
      },
    });

    return { ok: true as const, data: contact };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { ok: false as const, error: "A contact with this email already exists for this tenant" };
    }
    return { ok: false as const, error: "Failed to create contact" };
  }
}

export async function updateContact(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  const parsed = ContactUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid contact input" };
  }

  const existing = await prisma.contact.findFirst({
    where: { id: parsed.data.contactId, tenantId: context.tenant.id },
  });
  if (!existing) {
    return { ok: false as const, error: "Contact not found" };
  }

  const contact = await prisma.contact.update({
    where: { id: existing.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || null,
      type: parsed.data.type,
      notes: parsed.data.notes || null,
      tags: parseTags(parsed.data.tags),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "UPDATE",
      metadata: { entity: "Contact", contactId: contact.id },
    },
  });

  return { ok: true as const, data: contact };
}

export async function deleteContact(contactId: string, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  const id = contactId.trim();
  if (!id) {
    return { ok: false as const, error: "Contact id required" };
  }

  const existing = await prisma.contact.findFirst({
    where: { id, tenantId: context.tenant.id },
    select: { id: true, email: true },
  });
  if (!existing) {
    return { ok: false as const, error: "Contact not found" };
  }

  await prisma.eventRegistration.deleteMany({ where: { contactId: existing.id, tenantId: context.tenant.id } });
  await prisma.membership.deleteMany({ where: { contactId: existing.id, tenantId: context.tenant.id } });
  await prisma.contact.delete({ where: { id: existing.id } });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "DELETE",
      metadata: { entity: "Contact", contactId: existing.id, email: existing.email },
    },
  });

  return { ok: true as const };
}

export async function listContacts(input: unknown = {}) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return {
      ok: false as const,
      error: auth.error,
      tenant: null,
      data: [] as any[],
      sourceOptions: [] as string[],
      interestOptions: [] as string[],
    };
  }

  const context = auth.context;
  const parsed = ContactListSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : {};
  const where: Prisma.ContactWhereInput = { tenantId: context.tenant.id };

  if (filters.q) {
    where.OR = [
      { firstName: { contains: filters.q, mode: "insensitive" } },
      { lastName: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } },
      { phone: { contains: filters.q, mode: "insensitive" } },
      { notes: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.source) {
    where.source = filters.source;
  }

  if (filters.interestType) {
    where.interestType = filters.interestType;
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }, { email: "asc" }],
    take: CONTACT_LIST_PAGE_SIZE,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      type: true,
      source: true,
      interestType: true,
      lastActivityAt: true,
      lastActivitySummary: true,
      notes: true,
      tags: true,
      externalSource: true,
      importedAt: true,
      createdAt: true,
      tenant: {
        select: { id: true, name: true, slug: true, clerkOrgId: true },
      },
      registrations: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          status: true,
          createdAt: true,
          event: {
            select: {
              title: true,
              slug: true,
              startsAt: true,
            },
          },
        },
      },
      _count: {
        select: { registrations: true },
      },
    },
  });

  const totalCount = await prisma.contact.count({ where });

  const [sourceRows, interestRows] = await Promise.all([
    prisma.contact.findMany({
      where: { tenantId: context.tenant.id, source: { not: null } },
      distinct: ["source"],
      select: { source: true },
      orderBy: { source: "asc" },
    }),
    prisma.contact.findMany({
      where: { tenantId: context.tenant.id, interestType: { not: null } },
      distinct: ["interestType"],
      select: { interestType: true },
      orderBy: { interestType: "asc" },
    }),
  ]);

  return {
    ok: true as const,
    tenant: context.tenant,
    data: contacts,
    totalCount,
    truncated: totalCount > contacts.length,
    sourceOptions: sourceRows.map((row) => row.source).filter((source): source is string => Boolean(source)),
    interestOptions: interestRows
      .map((row) => row.interestType)
      .filter((interestType): interestType is string => Boolean(interestType)),
  };
}

export async function getContactProfile(contactId: string) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: null as any };
  }
  const context = auth.context;

  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      tenantId: context.tenant.id,
    },
    include: {
      memberships: {
        include: {
          tier: true,
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
          },
        },
        orderBy: [{ status: "asc" }, { expiresAt: "asc" }, { createdAt: "desc" }],
      },
      registrations: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startsAt: true,
              location: true,
            },
          },
          ticketType: {
            select: {
              id: true,
              name: true,
            },
          },
          payments: {
            where: { purpose: "EVENT" },
            orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
            include: {
              receipt: {
                select: {
                  receiptNumber: true,
                  issuedAt: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
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
      },
      receipts: {
        orderBy: [{ issuedAt: "desc" }],
      },
      communications: {
        orderBy: [{ createdAt: "desc" }],
        take: 25,
      },
      tenant: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!contact) {
    return { ok: false as const, error: "Contact not found", data: null as any };
  }

  return { ok: true as const, data: contact };
}
