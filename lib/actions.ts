"use server";

/**
 * lib/actions.ts — All server-side data mutations for Janagana v3.
 *
 * ARCHITECTURE CONTRACT:
 * - Every mutation validates the caller's Clerk session.
 * - Every mutation validates the caller is a member of the target Clerk org.
 * - Every mutation filters by tenantId.
 * - Public registration actions (registerForEvent) do NOT require Clerk auth
 *   and MUST NEVER create a Clerk Organization.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { z } from "zod";
import type {
  TenantStatus,
  ContactType,
  MembershipInterval,
  EventStatus,
} from "@prisma/client";

// ─── TENANT ───────────────────────────────────────────────────────────────────

const CreateTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  clerkOrgId: z.string().min(1),
});

export async function createTenant(data: {
  name: string;
  slug: string;
  clerkOrgId: string;
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const validated = CreateTenantSchema.safeParse(data);
  if (!validated.success) return { error: "Invalid input" };

  const existing = await prisma.tenant.findUnique({
    where: { clerkOrgId: validated.data.clerkOrgId },
  });
  if (existing) return { data: existing };

  const slugExists = await prisma.tenant.findUnique({
    where: { slug: validated.data.slug },
  });
  if (slugExists) return { error: "Slug already taken" };

  const tenant = await prisma.tenant.create({
    data: {
      name: validated.data.name,
      slug: validated.data.slug,
      clerkOrgId: validated.data.clerkOrgId,
      adminRoles: {
        create: { clerkUserId: userId },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: userId,
      action: "CREATE",
      metadata: { entity: "Tenant", name: tenant.name },
    },
  });

  return { data: tenant };
}

// ─── CONTACTS ─────────────────────────────────────────────────────────────────

const CreateContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  type: z.enum(["MEMBER", "REGISTRANT", "VOLUNTEER", "DONOR", "OTHER"]),
});

export async function createContact(
  tenantId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    type: ContactType;
  }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return { error: "Not authenticated" };

  const tenant = await requireTenantAccess(tenantId, orgId);
  if (!tenant) return { error: "Access denied" };

  const validated = CreateContactSchema.safeParse(data);
  if (!validated.success) return { error: "Invalid input", details: validated.error.flatten() };

  // Upsert by email within tenant
  const contact = await prisma.contact.upsert({
    where: { tenantId_email: { tenantId, email: validated.data.email } },
    update: {
      firstName: validated.data.firstName,
      lastName: validated.data.lastName,
      phone: validated.data.phone,
      type: validated.data.type,
    },
    create: {
      tenantId,
      ...validated.data,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: userId,
      action: "CREATE",
      metadata: { entity: "Contact", contactId: contact.id },
    },
  });

  revalidatePath("/dashboard/members");
  return { data: contact };
}

// ─── MEMBERSHIP TIERS ─────────────────────────────────────────────────────────

const CreateTierSchema = z.object({
  name: z.string().min(1).max(100),
  amountCents: z.number().int().min(0),
  interval: z.enum(["MONTHLY", "ANNUAL", "ONE_TIME"]),
  stripePriceId: z.string().optional(),
});

export async function createMembershipTier(
  tenantId: string,
  data: {
    name: string;
    amountCents: number;
    interval: MembershipInterval;
    stripePriceId?: string;
  }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return { error: "Not authenticated" };

  const tenant = await requireTenantAccess(tenantId, orgId);
  if (!tenant) return { error: "Access denied" };

  const validated = CreateTierSchema.safeParse(data);
  if (!validated.success) return { error: "Invalid input", details: validated.error.flatten() };

  const tier = await prisma.membershipTier.create({
    data: { tenantId, ...validated.data },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: userId,
      action: "CREATE",
      metadata: { entity: "MembershipTier", tierId: tier.id },
    },
  });

  revalidatePath("/dashboard/tiers");
  return { data: tier };
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

const CreateEventSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  startsAt: z.coerce.date(),
  location: z.string().optional(),
  priceCents: z.number().int().min(0).default(0),
  capacity: z.number().int().min(1).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELED", "COMPLETED"]).default("DRAFT"),
});

export async function createEvent(
  tenantId: string,
  data: {
    title: string;
    description?: string;
    startsAt: Date | string;
    location?: string;
    priceCents?: number;
    capacity?: number;
    status?: EventStatus;
  }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return { error: "Not authenticated" };

  const tenant = await requireTenantAccess(tenantId, orgId);
  if (!tenant) return { error: "Access denied" };

  const validated = CreateEventSchema.safeParse(data);
  if (!validated.success) return { error: "Invalid input", details: validated.error.flatten() };

  // Generate unique slug within tenant
  const baseSlug = slugify(validated.data.title);
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const existing = await prisma.event.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const event = await prisma.event.create({
    data: { tenantId, slug, ...validated.data },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: userId,
      action: "CREATE",
      metadata: { entity: "Event", eventId: event.id },
    },
  });

  revalidatePath("/dashboard/events");
  return { data: event };
}

// ─── PUBLIC REGISTRATION ──────────────────────────────────────────────────────

/**
 * Register a public visitor for an event.
 *
 * SECURITY INVARIANTS:
 * 1. Does NOT require Clerk authentication.
 * 2. MUST NOT call any Clerk organization creation API.
 * 3. Creates only: Contact (upsert by email) + EventRegistration.
 * 4. tenantId is resolved from the event's tenantId — NOT from any cookie.
 */
const PublicRegistrationSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
});

export async function registerForEvent(
  eventId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  }
) {
  const validated = PublicRegistrationSchema.safeParse(data);
  if (!validated.success) return { error: "Invalid input", details: validated.error.flatten() };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, tenantId: true, status: true, capacity: true },
  });

  if (!event) return { error: "Event not found" };
  if (event.status !== "PUBLISHED") return { error: "Event is not open for registration" };

  // Check capacity
  if (event.capacity !== null) {
    const currentCount = await prisma.eventRegistration.count({
      where: { eventId, status: { in: ["CONFIRMED", "ATTENDED"] } },
    });
    if (currentCount >= event.capacity) return { error: "Event is at capacity" };
  }

  // Upsert contact (reuse if email already seen for this tenant)
  const contact = await prisma.contact.upsert({
    where: { tenantId_email: { tenantId: event.tenantId, email: validated.data.email } },
    update: {
      firstName: validated.data.firstName,
      lastName: validated.data.lastName,
      phone: validated.data.phone,
    },
    create: {
      tenantId: event.tenantId,
      type: "REGISTRANT",
      ...validated.data,
    },
  });

  // Upsert registration (idempotent)
  const registration = await prisma.eventRegistration.upsert({
    where: { eventId_contactId: { eventId, contactId: contact.id } },
    update: { status: "CONFIRMED" },
    create: {
      tenantId: event.tenantId,
      eventId,
      contactId: contact.id,
      status: "CONFIRMED",
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: event.tenantId,
      action: "REGISTER",
      metadata: {
        entity: "EventRegistration",
        eventId,
        contactId: contact.id,
        registrationId: registration.id,
      },
    },
  });

  return { data: { registration, contact } };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Verify the active Clerk org maps to the given tenantId.
 * Returns the Tenant if valid, null if access is denied.
 *
 * NOTE: orgId comes from the validated Clerk session — it is not a cookie.
 */
async function requireTenantAccess(tenantId: string, clerkOrgId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, clerkOrgId: true, status: true },
  });

  if (!tenant) return null;
  if (tenant.clerkOrgId !== clerkOrgId) return null;
  if (tenant.status !== "ACTIVE") return null;

  return tenant;
}
