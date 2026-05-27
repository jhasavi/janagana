import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";

const PublicRegistrationSchema = z
  .object({
    tenantSlug: z.string().trim().min(1),
    eventSlug: z.string().trim().min(1),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
  })
  .strict();

export async function listPublishedPortalEvents(tenantSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return { ok: false as const, error: "Tenant not found", tenant: null, data: [] as any[] };
  }

  const events = await prisma.event.findMany({
    where: {
      tenantId: tenant.id,
      status: "PUBLISHED",
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
  });

  return { ok: true as const, tenant, data: events };
}

export async function getPublishedPortalEvent(tenantSlug: string, eventSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return { ok: false as const, error: "Tenant not found", tenant: null, data: null as any };
  }

  const event = await prisma.event.findFirst({
    where: {
      tenantId: tenant.id,
      slug: eventSlug,
      status: "PUBLISHED",
    },
  });

  if (!event) {
    return { ok: false as const, error: "Event not found", tenant, data: null as any };
  }

  return { ok: true as const, tenant, data: event };
}

export async function registerPublicEvent(input: unknown) {
  const parsed = PublicRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, alreadyRegistered: false, error: parsed.error.issues[0]?.message ?? "Invalid registration input" };
  }

  const tenant = await getTenantBySlug(parsed.data.tenantSlug);
  if (!tenant) {
    return { ok: false as const, alreadyRegistered: false, error: "Tenant not found" };
  }

  const event = await prisma.event.findFirst({
    where: {
      tenantId: tenant.id,
      slug: parsed.data.eventSlug,
      status: "PUBLISHED",
    },
  });
  if (!event) {
    return { ok: false as const, alreadyRegistered: false, error: "Event not found" };
  }

  const email = parsed.data.email.toLowerCase();
  const contact = await prisma.contact.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email,
      },
    },
    update: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || null,
      type: "REGISTRANT",
    },
    create: {
      tenantId: tenant.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email,
      phone: parsed.data.phone || null,
      type: "REGISTRANT",
    },
  });

  const existingRegistration = await prisma.eventRegistration.findFirst({
    where: {
      tenantId: tenant.id,
      eventId: event.id,
      contactId: contact.id,
    },
  });

  if (existingRegistration) {
    return {
      ok: true as const,
      alreadyRegistered: true as const,
      tenant,
      event,
      contact,
      registration: existingRegistration,
    };
  }

  const registration = await prisma.eventRegistration.create({
    data: {
      tenantId: tenant.id,
      eventId: event.id,
      contactId: contact.id,
      status: "CONFIRMED",
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: null,
      action: "REGISTER",
      metadata: {
        entity: "EventRegistration",
        source: "public_portal",
        eventId: event.id,
        contactId: contact.id,
      },
    },
  });

  return {
    ok: true as const,
    alreadyRegistered: false as const,
    tenant,
    event,
    contact,
    registration,
  };
}
