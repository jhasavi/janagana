import { z } from "zod";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { checkRateLimit } from "@/lib/rate-limit";
import { queueEventRegistrationCommunication } from "@/lib/communications/outbox";

const PublicRegistrationSchema = z
  .object({
    tenantSlug: z.string().trim().min(1),
    eventSlug: z.string().trim().min(1),
    ticketTypeId: z.string().trim().optional().or(z.literal("")),
    quantity: z.coerce.number().int().min(1).max(10).default(1),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
  })
  .strict();

const ACTIVE_REGISTRATION_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "ATTENDED"] as const;

function isRetryableTransactionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2034";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("write conflict") ||
      message.includes("deadlock") ||
      message.includes("transaction failed to commit")
    );
  }

  return false;
}

const PublicLeadCaptureSchema = z
  .object({
    tenantSlug: z.string().trim().min(1),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    message: z.string().trim().max(1000).optional().or(z.literal("")),
    interestType: z.enum(["NEWSLETTER", "CLASS_INTEREST", "MEMBERSHIP_INTEREST", "INVESTMENT_ANALYSIS"]),
    source: z.string().trim().max(120).optional().or(z.literal("")),
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
    include: {
      ticketTypes: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
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
    include: {
      ticketTypes: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!event) {
    return { ok: false as const, alreadyRegistered: false, error: "Event not found" };
  }

  const email = parsed.data.email.toLowerCase();
  const requestedTicketTypeId = parsed.data.ticketTypeId || null;
  const selectedTicketType =
    (requestedTicketTypeId
      ? event.ticketTypes.find((ticket) => ticket.id === requestedTicketTypeId)
      : event.ticketTypes[0]) ?? null;

  if (requestedTicketTypeId && !selectedTicketType) {
    return { ok: false as const, alreadyRegistered: false, error: "Ticket type not found" };
  }

  const quantity = parsed.data.quantity;

  // Lightweight anti-abuse guard for repeated submit attempts.
  // Falls back to non-request scope when called outside HTTP request context.
  let clientIp = "unknown";
  try {
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
    clientIp = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  } catch {
    // No request context (e.g. script usage); skip IP extraction.
  }

  const throttle = checkRateLimit(
    `public-register:${tenant.id}:${event.id}:${clientIp}:${email}`,
    5,
    60_000,
  );
  if (!throttle.allowed) {
    return {
      ok: false as const,
      alreadyRegistered: false as const,
      error: `Too many attempts. Please wait ${throttle.retryAfterSeconds}s and try again.`,
    };
  }

  const existingContact = await prisma.contact.findUnique({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email,
      },
    },
  });

  const existingRegistration = existingContact
    ? await prisma.eventRegistration.findFirst({
        where: {
          tenantId: tenant.id,
          eventId: event.id,
          contactId: existingContact.id,
        },
      })
    : null;

  if (existingRegistration) {
    return {
      ok: true as const,
      alreadyRegistered: true as const,
      tenant,
      event,
      contact: existingContact,
      registration: existingRegistration,
    };
  }

  const maxConcurrencyRetries = 6;
  let attempt = 0;
  while (attempt < maxConcurrencyRetries) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Serialize capacity checks per event without Serializable isolation (less write churn).
          await tx.$executeRaw`SELECT id FROM "Event" WHERE id = ${event.id} FOR UPDATE`;

          const activeRows = await tx.eventRegistration.findMany({
            where: {
              tenantId: tenant.id,
              eventId: event.id,
              status: { in: [...ACTIVE_REGISTRATION_STATUSES] },
            },
            select: { quantity: true },
          });
          const activeCount = activeRows.reduce((sum, row) => sum + row.quantity, 0);

          if (event.capacity !== null) {
            if (activeCount + quantity > event.capacity) {
              return {
                ok: false as const,
                alreadyRegistered: false as const,
                error: "This event is full.",
              };
            }
          }

          if (selectedTicketType?.capacity !== null && selectedTicketType?.capacity !== undefined) {
            const ticketRows = await tx.eventRegistration.findMany({
              where: {
                tenantId: tenant.id,
                eventId: event.id,
                ticketTypeId: selectedTicketType.id,
                status: { in: [...ACTIVE_REGISTRATION_STATUSES] },
              },
              select: { quantity: true },
            });
            const ticketCount = ticketRows.reduce((sum, row) => sum + row.quantity, 0);

            if (ticketCount + quantity > selectedTicketType.capacity) {
              return {
                ok: false as const,
                alreadyRegistered: false as const,
                error: "This ticket type is full.",
              };
            }
          }

          const contact = await tx.contact.upsert({
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
              source: "event_registration",
              interestType: "EVENT_REGISTRATION",
              lastActivityAt: new Date(),
              lastActivitySummary: `Registered for ${event.title}`,
            },
            create: {
              tenantId: tenant.id,
              firstName: parsed.data.firstName,
              lastName: parsed.data.lastName,
              email,
              phone: parsed.data.phone || null,
              type: "REGISTRANT",
              source: "event_registration",
              interestType: "EVENT_REGISTRATION",
              lastActivityAt: new Date(),
              lastActivitySummary: `Registered for ${event.title}`,
              tags: ["event"],
            },
          });

          const contactRegistration = await tx.eventRegistration.findFirst({
            where: {
              tenantId: tenant.id,
              eventId: event.id,
              contactId: contact.id,
            },
          });

          if (contactRegistration) {
            return {
              ok: true as const,
              alreadyRegistered: true as const,
              tenant,
              event,
              contact,
              registration: contactRegistration,
            };
          }

          const activeMembership = await tx.membership.findFirst({
            where: {
              tenantId: tenant.id,
              contactId: contact.id,
              status: "ACTIVE",
              OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
            },
            select: { id: true },
          });
          const unitPrice =
            activeMembership && selectedTicketType?.memberPriceCents !== null && selectedTicketType?.memberPriceCents !== undefined
              ? selectedTicketType.memberPriceCents
              : selectedTicketType?.priceCents ?? event.priceCents;
          const amountCents = unitPrice * quantity;
          const registration = await tx.eventRegistration.create({
            data: {
              tenantId: tenant.id,
              eventId: event.id,
              contactId: contact.id,
              ticketTypeId: selectedTicketType?.id ?? null,
              quantity,
              amountCents,
              status: amountCents > 0 ? "PENDING_PAYMENT" : "CONFIRMED",
            },
          });

          const payment =
            amountCents > 0
              ? await tx.paymentRecord.create({
                  data: {
                    tenantId: tenant.id,
                    contactId: contact.id,
                    eventId: event.id,
                    registrationId: registration.id,
                    amountCents,
                    status: "PENDING",
                    method: "OFFLINE",
                    purpose: "EVENT",
                    notes: "Event ticket payment due",
                  },
                })
              : null;

          return {
            ok: true as const,
            alreadyRegistered: false as const,
            tenant,
            event,
            contact,
            registration,
            payment,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );

      if (!result.ok) {
        return result;
      }

      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: null,
          action: "REGISTER",
          metadata: {
            entity: "EventRegistration",
            source: "public_portal",
            eventId: event.id,
            contactId: result.contact.id,
            registrationId: result.registration.id,
            paymentId: result.payment?.id ?? null,
          },
        },
      });

      await queueEventRegistrationCommunication(result.registration.id);

      return result;
    } catch (error) {
      if (isRetryableTransactionError(error)) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
        continue;
      }
      throw error;
    }
  }
  return {
    ok: false as const,
    alreadyRegistered: false as const,
    error: "Registration is busy right now. Please try again.",
  };
}

export async function capturePublicLead(input: unknown) {
  const parsed = PublicLeadCaptureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid lead capture input",
    };
  }

  const tenant = await getTenantBySlug(parsed.data.tenantSlug);
  if (!tenant) {
    return { ok: false as const, error: "Tenant not found" };
  }

  const email = parsed.data.email.toLowerCase();
  const firstName = parsed.data.firstName;
  const lastName = parsed.data.lastName;
  const phone = parsed.data.phone || null;
  const message = parsed.data.message || null;
  const source = parsed.data.source || "portal_contact";

  const existing = await prisma.contact.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    select: { type: true },
  });

  const preservedType =
    existing?.type === "REGISTRANT" || existing?.type === "MEMBER" ? existing.type : "OTHER";

  const contact = await prisma.contact.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email,
      },
    },
    update: {
      firstName,
      lastName,
      phone,
      type: preservedType,
      source,
      interestType: parsed.data.interestType,
      lastActivityAt: new Date(),
      lastActivitySummary: `Submitted ${parsed.data.interestType.toLowerCase().replace(/_/g, " ")} form`,
    },
    create: {
      tenantId: tenant.id,
      firstName,
      lastName,
      email,
      phone,
      type: "OTHER",
      source,
      interestType: parsed.data.interestType,
      lastActivityAt: new Date(),
      lastActivitySummary: `Submitted ${parsed.data.interestType.toLowerCase().replace(/_/g, " ")} form`,
      tags: [parsed.data.interestType.toLowerCase().replace(/_/g, "-")],
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: null,
      action: "CREATE",
      metadata: {
        entity: "ContactLead",
        source,
        contactId: contact.id,
        interestType: parsed.data.interestType,
        message,
      },
    },
  });

  return {
    ok: true as const,
    tenant,
    contact,
  };
}
