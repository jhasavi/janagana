import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { resolveTenantForDashboard } from "@/lib/tenant";

export const EventCreateSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    slug: z.string().trim().regex(/^[a-z0-9-]*$/).optional().or(z.literal("")),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    startsAt: z.coerce.date(),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    priceCents: z.number().int().min(0).default(0),
    capacity: z.number().int().min(1).optional(),
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

export async function createEvent(input: unknown) {
  const context = await requireActiveTenantContext();
  if ("error" in context) {
    return { ok: false as const, error: context.error };
  }

  const parsed = EventCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid event input" };
  }

  const baseSlug = parsed.data.slug && parsed.data.slug.length > 0 ? parsed.data.slug : slugify(parsed.data.title);
  let slug = baseSlug;
  let idx = 1;

  while (slug.length > 0) {
    const existing = await prisma.event.findUnique({
      where: { tenantId_slug: { tenantId: context.tenant.id, slug } },
      select: { id: true },
    });
    if (!existing) break;
    idx += 1;
    slug = `${baseSlug}-${idx}`;
  }

  if (!slug || slug.length === 0) {
    return { ok: false as const, error: "Unable to generate a valid event slug" };
  }

  try {
    const event = await prisma.event.create({
      data: {
        tenantId: context.tenant.id,
        title: parsed.data.title,
        slug,
        description: parsed.data.description || null,
        startsAt: parsed.data.startsAt,
        location: parsed.data.location || null,
        status: parsed.data.status,
        priceCents: parsed.data.priceCents,
        capacity: parsed.data.capacity ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: context.tenant.id,
        actorUserId: context.user.id,
        action: "CREATE",
        metadata: { entity: "Event", eventId: event.id },
      },
    });

    return { ok: true as const, data: event };
  } catch {
    return { ok: false as const, error: "Failed to create event" };
  }
}

export async function listEvents() {
  const context = await requireActiveTenantContext();
  if ("error" in context) {
    return { ok: false as const, error: context.error, data: [] as any[] };
  }

  const events = await prisma.event.findMany({
    where: { tenantId: context.tenant.id },
    include: {
      _count: {
        select: { registrations: true },
      },
      registrations: {
        select: { status: true },
      },
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
  });

  const data = events.map((event) => {
    const total = event._count.registrations;
    const confirmed = event.registrations.filter((reg) => reg.status === "CONFIRMED").length;

    return {
      ...event,
      registrationSummary: {
        confirmed,
        total,
      },
    };
  });

  return { ok: true as const, data };
}

export async function listEventRegistrations(eventId: string) {
  const context = await requireActiveTenantContext();
  if ("error" in context) {
    return { ok: false as const, error: context.error, data: [] as any[], event: null as any };
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: context.tenant.id },
    select: { id: true, title: true, slug: true, startsAt: true, status: true },
  });

  if (!event) {
    return { ok: false as const, error: "Event not found", data: [] as any[], event: null as any };
  }

  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId: event.id, tenantId: context.tenant.id },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return { ok: true as const, data: registrations, event };
}

type RegistrationStatusUpdate = "CONFIRMED" | "CANCELED";

export async function updateRegistrationStatusForTenant(input: {
  tenantId: string;
  eventId: string;
  registrationId: string;
  nextStatus: RegistrationStatusUpdate;
  actorUserId: string | null;
}) {
  const event = await prisma.event.findFirst({
    where: {
      id: input.eventId,
      tenantId: input.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      capacity: true,
    },
  });

  if (!event) {
    return { ok: false as const, error: "Event not found" };
  }

  const registration = await prisma.eventRegistration.findFirst({
    where: {
      id: input.registrationId,
      tenantId: input.tenantId,
      eventId: event.id,
    },
    select: {
      id: true,
      status: true,
      eventId: true,
      contactId: true,
    },
  });

  if (!registration) {
    return { ok: false as const, error: "Registration not found" };
  }

  if (registration.status === input.nextStatus) {
    return { ok: true as const, data: registration };
  }

  if (input.nextStatus === "CONFIRMED" && event.capacity !== null) {
    const confirmedCount = await prisma.eventRegistration.count({
      where: {
        tenantId: input.tenantId,
        eventId: event.id,
        status: "CONFIRMED",
        id: { not: registration.id },
      },
    });

    if (confirmedCount >= event.capacity) {
      return { ok: false as const, error: "This event is full." };
    }
  }

  const updated = await prisma.eventRegistration.update({
    where: { id: registration.id },
    data: {
      status: input.nextStatus,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: "UPDATE",
      metadata: {
        entity: "EventRegistration",
        eventId: event.id,
        registrationId: registration.id,
        fromStatus: registration.status,
        toStatus: input.nextStatus,
      },
    },
  });

  return { ok: true as const, data: updated };
}

export async function cancelEventRegistration(input: { eventId: string; registrationId: string }) {
  const context = await requireActiveTenantContext();
  if ("error" in context) {
    return { ok: false as const, error: context.error };
  }

  return updateRegistrationStatusForTenant({
    tenantId: context.tenant.id,
    eventId: input.eventId,
    registrationId: input.registrationId,
    nextStatus: "CANCELED",
    actorUserId: context.user.id,
  });
}

export async function confirmEventRegistration(input: { eventId: string; registrationId: string }) {
  const context = await requireActiveTenantContext();
  if ("error" in context) {
    return { ok: false as const, error: context.error };
  }

  return updateRegistrationStatusForTenant({
    tenantId: context.tenant.id,
    eventId: input.eventId,
    registrationId: input.registrationId,
    nextStatus: "CONFIRMED",
    actorUserId: context.user.id,
  });
}
