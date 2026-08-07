import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { checkRateLimit } from "@/lib/rate-limit";
import { configuredAppUrl } from "@/lib/environment";
import { queueHouseholdInviteCommunication } from "@/lib/communications/outbox";
import { getCurrentMemberContact } from "@/lib/actions/member-auth";
import {
  generateMemberToken,
  hashMemberToken,
  setMemberSessionCookie,
} from "@/lib/portal/member-session";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const InviteSchema = z
  .object({
    tenantSlug: z.string().trim().min(1),
    email: z.string().trim().email(),
  })
  .strict();

/** Household + pending invites the signed-in member can see/manage — their own only. */
export async function getMyHousehold(tenantSlug: string) {
  const current = await getCurrentMemberContact(tenantSlug);
  if (!current) {
    return { ok: false as const, error: "Not signed in", data: null };
  }

  const contact = await prisma.contact.findUnique({
    where: { id: current.contact.id },
    select: {
      householdId: true,
      household: {
        select: {
          id: true,
          name: true,
          payerContactId: true,
          members: { select: { id: true, firstName: true, lastName: true, email: true } },
          invites: {
            where: { status: "PENDING" },
            select: { id: true, inviteeEmail: true, expiresAt: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  return { ok: true as const, data: contact?.household ?? null };
}

/**
 * Member-initiated invite. Does NOT search or link any existing contact directly —
 * that would let one member silently attach a stranger's account to their household
 * by guessing an email. Instead this only ever emails the invitee a confirmation
 * link; linking happens when THEY accept it (see acceptHouseholdInvite).
 */
export async function inviteHouseholdMember(input: unknown) {
  const parsed = InviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const current = await getCurrentMemberContact(parsed.data.tenantSlug);
  if (!current) {
    return { ok: false as const, error: "Not signed in" };
  }
  const { tenant, contact } = current;
  const email = parsed.data.email.toLowerCase();

  if (email === contact.email) {
    return { ok: false as const, error: "You can't invite yourself" };
  }

  const throttle = checkRateLimit(`household-invite:${tenant.id}:${contact.id}`, 5, 10 * 60_000);
  if (!throttle.allowed) {
    return { ok: false as const, error: `Too many invites sent. Please wait ${throttle.retryAfterSeconds}s and try again.` };
  }

  let householdId = contact.householdId;
  if (!householdId) {
    const household = await prisma.household.create({
      data: {
        tenantId: tenant.id,
        name: `${contact.lastName} Family`,
        payerContactId: contact.id,
      },
    });
    await prisma.contact.update({ where: { id: contact.id }, data: { householdId: household.id } });
    householdId = household.id;
  }

  const existingPending = await prisma.householdInvite.findFirst({
    where: { tenantId: tenant.id, householdId, inviteeEmail: email, status: "PENDING" },
  });
  if (existingPending) {
    return { ok: false as const, error: "An invite to this email is already pending" };
  }

  const household = await prisma.household.findUniqueOrThrow({ where: { id: householdId } });

  const rawToken = generateMemberToken();
  const invite = await prisma.householdInvite.create({
    data: {
      tenantId: tenant.id,
      householdId,
      invitedByContactId: contact.id,
      inviteeEmail: email,
      tokenHash: hashMemberToken(rawToken),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const acceptUrl = `${configuredAppUrl()}/portal/${tenant.slug}/household-invite/${rawToken}`;
  await queueHouseholdInviteCommunication({
    tenantId: tenant.id,
    tenantName: tenant.name,
    inviteeEmail: email,
    inviterName: `${contact.firstName} ${contact.lastName}`.trim(),
    householdName: household.name,
    acceptUrl,
  });

  return { ok: true as const, data: invite };
}

export async function cancelHouseholdInvite(input: unknown) {
  const parsed = z.object({ tenantSlug: z.string().trim().min(1), inviteId: z.string().trim().min(1) }).strict().safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const current = await getCurrentMemberContact(parsed.data.tenantSlug);
  if (!current) {
    return { ok: false as const, error: "Not signed in" };
  }

  const invite = await prisma.householdInvite.findFirst({
    where: { id: parsed.data.inviteId, tenantId: current.tenant.id, invitedByContactId: current.contact.id, status: "PENDING" },
  });
  if (!invite) {
    return { ok: false as const, error: "Invite not found" };
  }

  await prisma.householdInvite.update({ where: { id: invite.id }, data: { status: "CANCELED", respondedAt: new Date() } });
  return { ok: true as const };
}

/** Loads a pending invite by its raw token for the accept/decline landing page. Public — token is the credential. */
export async function getHouseholdInviteByToken(tenantSlug: string, rawToken: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { ok: false as const, error: "Community not found", data: null };

  const invite = await prisma.householdInvite.findUnique({
    where: { tokenHash: hashMemberToken(rawToken) },
    include: {
      household: { select: { id: true, name: true } },
      invitedBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!invite || invite.tenantId !== tenant.id) {
    return { ok: false as const, error: "Invite not found", data: null };
  }
  if (invite.status !== "PENDING") {
    return { ok: false as const, error: `This invite was already ${invite.status.toLowerCase()}.`, data: null };
  }
  if (invite.expiresAt < new Date()) {
    return { ok: false as const, error: "This invite link has expired. Ask them to send a new one.", data: null };
  }

  const existingContact = await prisma.contact.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: invite.inviteeEmail } },
    select: { id: true, firstName: true, lastName: true, householdId: true },
  });

  return {
    ok: true as const,
    data: {
      tenant,
      invite,
      existingContact,
      alreadyInAnotherHousehold: Boolean(existingContact?.householdId && existingContact.householdId !== invite.householdId),
    },
  };
}

const AcceptSchema = z
  .object({
    tenantSlug: z.string().trim().min(1),
    token: z.string().trim().min(1),
    firstName: z.string().trim().max(100).optional().or(z.literal("")),
    lastName: z.string().trim().max(100).optional().or(z.literal("")),
  })
  .strict();

/**
 * Accepting the invite is the only thing that actually links a contact into the
 * household. The emailed link (single-use, hashed, 7-day expiry) is the proof of
 * ownership of `inviteeEmail` — no separate sign-in round trip needed.
 */
export async function acceptHouseholdInvite(input: unknown) {
  const parsed = AcceptSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const lookup = await getHouseholdInviteByToken(parsed.data.tenantSlug, parsed.data.token);
  if (!lookup.ok || !lookup.data) {
    return { ok: false as const, error: lookup.error ?? "Invite not found" };
  }
  const { tenant, invite, existingContact, alreadyInAnotherHousehold } = lookup.data;

  if (alreadyInAnotherHousehold) {
    return {
      ok: false as const,
      error: "This email is already part of a different household. Ask an admin to move it.",
    };
  }

  let contactId: string;

  if (existingContact) {
    contactId = existingContact.id;
    if (!existingContact.householdId) {
      await prisma.contact.update({ where: { id: contactId }, data: { householdId: invite.householdId } });
    }
  } else {
    const firstName = parsed.data.firstName?.trim();
    const lastName = parsed.data.lastName?.trim();
    if (!firstName || !lastName) {
      return { ok: false as const, error: "First and last name are required", needsName: true as const };
    }
    const created = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        firstName,
        lastName,
        email: invite.inviteeEmail,
        type: "OTHER",
        source: "household_invite",
        householdId: invite.householdId,
        lastActivityAt: new Date(),
        lastActivitySummary: "Joined household via invite",
      },
    });
    contactId = created.id;
  }

  const rawSessionToken = generateMemberToken();
  await prisma.$transaction([
    prisma.householdInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", respondedAt: new Date(), acceptedContactId: contactId },
    }),
    prisma.contactSession.create({
      data: {
        tenantId: tenant.id,
        contactId,
        tokenHash: hashMemberToken(rawSessionToken),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    }),
  ]);

  await setMemberSessionCookie(rawSessionToken);
  return { ok: true as const, tenantSlug: tenant.slug };
}

export async function declineHouseholdInvite(input: unknown) {
  const parsed = z.object({ tenantSlug: z.string().trim().min(1), token: z.string().trim().min(1) }).strict().safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const lookup = await getHouseholdInviteByToken(parsed.data.tenantSlug, parsed.data.token);
  if (!lookup.ok || !lookup.data) {
    return { ok: false as const, error: lookup.error ?? "Invite not found" };
  }

  await prisma.householdInvite.update({
    where: { id: lookup.data.invite.id },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
  return { ok: true as const };
}
