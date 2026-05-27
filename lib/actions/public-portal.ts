import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { checkRateLimit } from "@/lib/rate-limit";

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

  if (event.capacity !== null) {
    const confirmedCount = await prisma.eventRegistration.count({
      where: {
        tenantId: tenant.id,
        eventId: event.id,
        status: "CONFIRMED",
      },
    });

    if (confirmedCount >= event.capacity) {
      return {
        ok: false as const,
        alreadyRegistered: false as const,
        error: "This event is full.",
      };
    }
  }

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

  const contactRegistration = await prisma.eventRegistration.findFirst({
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
      type: "OTHER",
    },
    create: {
      tenantId: tenant.id,
      firstName,
      lastName,
      email,
      phone,
      type: "OTHER",
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
