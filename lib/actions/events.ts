import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { requireActiveTenantForActions } from "@/lib/tenant";
import { issueReceiptForPayment } from "@/lib/payments/receipts";
import { queueEventRegistrationCommunication } from "@/lib/communications/outbox";

export const EventCreateSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    slug: z.string().trim().regex(/^[a-z0-9-]*$/).optional().or(z.literal("")),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    startsAt: z.coerce.date(),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    priceCents: z.number().int().min(0).default(0),
    memberPriceCents: z.number().int().min(0).optional(),
    capacity: z.number().int().min(1).optional(),
  })
  .strict();

const ACTIVE_REGISTRATION_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "ATTENDED"] as const;

export async function createEvent(input: unknown) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

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
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
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

      await tx.eventTicketType.create({
        data: {
          tenantId: context.tenant.id,
          eventId: created.id,
          name: "General admission",
          priceCents: parsed.data.priceCents,
          memberPriceCents: parsed.data.memberPriceCents ?? null,
          capacity: parsed.data.capacity ?? null,
          active: true,
          sortOrder: 0,
        },
      });

      return created;
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
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: [] as any[] };
  }
  const context = auth.context;

  const events = await prisma.event.findMany({
    where: { tenantId: context.tenant.id },
    include: {
      _count: {
        select: { registrations: true },
      },
      registrations: {
        select: { status: true, quantity: true },
      },
      ticketTypes: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
  });

  const data = events.map((event) => {
    const total = event._count.registrations;
    const confirmed = event.registrations
      .filter((reg) => reg.status === "CONFIRMED" || reg.status === "ATTENDED")
      .reduce((sum, reg) => sum + reg.quantity, 0);
    const active = event.registrations
      .filter((reg) => ACTIVE_REGISTRATION_STATUSES.includes(reg.status as any))
      .reduce((sum, reg) => sum + reg.quantity, 0);

    return {
      ...event,
      registrationSummary: {
        confirmed,
        active,
        total,
      },
    };
  });

  return { ok: true as const, data };
}

export async function listEventRegistrations(eventId: string) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: [] as any[], event: null as any };
  }
  const context = auth.context;

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: context.tenant.id },
    include: {
      ticketTypes: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
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
      ticketType: {
        select: { id: true, name: true, priceCents: true, memberPriceCents: true },
      },
      payments: {
        where: { purpose: "EVENT" },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        take: 3,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return { ok: true as const, data: registrations, event };
}

type RegistrationStatusUpdate = "PENDING_PAYMENT" | "CONFIRMED" | "CANCELED" | "ATTENDED" | "NO_SHOW";

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
      quantity: true,
    },
  });

  if (!registration) {
    return { ok: false as const, error: "Registration not found" };
  }

  if (registration.status === input.nextStatus) {
    return { ok: true as const, data: registration };
  }

  if (ACTIVE_REGISTRATION_STATUSES.includes(input.nextStatus as any) && event.capacity !== null) {
    const activeRows = await prisma.eventRegistration.findMany({
      where: {
        tenantId: input.tenantId,
        eventId: event.id,
        status: { in: [...ACTIVE_REGISTRATION_STATUSES] },
        id: { not: registration.id },
      },
      select: { quantity: true },
    });
    const activeCount = activeRows.reduce((sum, row) => sum + row.quantity, 0);

    if (activeCount + registration.quantity > event.capacity) {
      return { ok: false as const, error: "This event is full." };
    }
  }

  const updated = await prisma.eventRegistration.update({
    where: { id: registration.id },
    data: {
      status: input.nextStatus,
      checkedInAt: input.nextStatus === "ATTENDED" ? new Date() : input.nextStatus === "CONFIRMED" ? null : undefined,
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

  if (registration.status === "PENDING_PAYMENT" && input.nextStatus === "CONFIRMED") {
    const payments = await prisma.paymentRecord.findMany({
      where: {
        tenantId: input.tenantId,
        registrationId: registration.id,
        purpose: "EVENT",
        status: "PENDING",
      },
      select: { id: true },
    });

    await prisma.paymentRecord.updateMany({
      where: {
        id: { in: payments.map((payment) => payment.id) },
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
        notes: "Marked paid when registration was confirmed by admin",
      },
    });

    for (const payment of payments) {
      await issueReceiptForPayment(payment.id);
    }
  }

  if (input.nextStatus === "CONFIRMED" && registration.status !== "CONFIRMED") {
    await queueEventRegistrationCommunication(registration.id);
  }

  return { ok: true as const, data: updated };
}

export async function cancelEventRegistration(input: { eventId: string; registrationId: string }) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  return updateRegistrationStatusForTenant({
    tenantId: context.tenant.id,
    eventId: input.eventId,
    registrationId: input.registrationId,
    nextStatus: "CANCELED",
    actorUserId: context.user.id,
  });
}

export async function confirmEventRegistration(input: { eventId: string; registrationId: string }) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  return updateRegistrationStatusForTenant({
    tenantId: context.tenant.id,
    eventId: input.eventId,
    registrationId: input.registrationId,
    nextStatus: "CONFIRMED",
    actorUserId: context.user.id,
  });
}

export async function checkInEventRegistration(input: { eventId: string; registrationId: string }) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  return updateRegistrationStatusForTenant({
    tenantId: context.tenant.id,
    eventId: input.eventId,
    registrationId: input.registrationId,
    nextStatus: "ATTENDED",
    actorUserId: context.user.id,
  });
}

export async function markEventRegistrationNoShow(input: { eventId: string; registrationId: string }) {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  return updateRegistrationStatusForTenant({
    tenantId: context.tenant.id,
    eventId: input.eventId,
    registrationId: input.registrationId,
    nextStatus: "NO_SHOW",
    actorUserId: context.user.id,
  });
}
