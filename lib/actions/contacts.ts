import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { resolveTenantForDashboard } from "@/lib/tenant";

export const ContactCreateSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    type: z.enum(["MEMBER", "REGISTRANT", "VOLUNTEER", "DONOR", "OTHER"]).default("MEMBER"),
  })
  .strict();

export const ContactUpdateSchema = z
  .object({
    contactId: z.string().trim().min(1),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    type: z.enum(["MEMBER", "REGISTRANT", "VOLUNTEER", "DONOR", "OTHER"]),
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

export async function createContact(input: unknown) {
  const context = await requireActiveTenantContext();
  if ("error" in context) {
    return { ok: false as const, error: context.error };
  }

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

export async function updateContact(input: unknown) {
  const context = await requireActiveTenantContext();
  if ("error" in context) {
    return { ok: false as const, error: context.error };
  }

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

export async function listContacts() {
  const context = await requireActiveTenantContext();
  if ("error" in context) {
    return { ok: false as const, error: context.error, data: [] as any[] };
  }

  const contacts = await prisma.contact.findMany({
    where: { tenantId: context.tenant.id },
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
  });

  return { ok: true as const, data: contacts };
}
