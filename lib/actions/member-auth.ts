import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { checkRateLimit } from "@/lib/rate-limit";
import { configuredAppUrl } from "@/lib/environment";
import { queueMemberSignInCommunication } from "@/lib/communications/outbox";
import {
  generateMemberToken,
  hashMemberToken,
  getMemberSessionCookie,
  clearMemberSessionCookie,
} from "@/lib/portal/member-session";

const LOGIN_TOKEN_TTL_MS = 20 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const RequestSignInSchema = z
  .object({
    tenantSlug: z.string().trim().min(1),
    email: z.string().trim().email(),
  })
  .strict();

const UpdateProfileSchema = z
  .object({
    tenantSlug: z.string().trim().min(1),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
  })
  .strict();

export async function requestMemberSignIn(input: unknown) {
  const parsed = RequestSignInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tenant = await getTenantBySlug(parsed.data.tenantSlug);
  if (!tenant) {
    return { ok: false as const, error: "Tenant not found" };
  }

  const email = parsed.data.email.toLowerCase();

  const throttle = checkRateLimit(`member-sign-in:${tenant.id}:${email}`, 5, 10 * 60_000);
  if (!throttle.allowed) {
    return {
      ok: false as const,
      error: `Too many attempts. Please wait ${throttle.retryAfterSeconds}s and try again.`,
    };
  }

  const contact = await prisma.contact.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  // Always report success, even when no contact matches, so this cannot be
  // used to enumerate which emails belong to members.
  if (!contact) {
    return { ok: true as const };
  }

  const rawToken = generateMemberToken();
  await prisma.contactLoginToken.create({
    data: {
      tenantId: tenant.id,
      contactId: contact.id,
      tokenHash: hashMemberToken(rawToken),
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
    },
  });

  const magicLinkUrl = `${configuredAppUrl()}/api/portal/member-verify?token=${rawToken}&tenant=${encodeURIComponent(tenant.slug)}`;

  await queueMemberSignInCommunication({
    tenantId: tenant.id,
    contactId: contact.id,
    tenantName: tenant.name,
    recipientEmail: contact.email,
    recipientName: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || null,
    magicLinkUrl,
  });

  return { ok: true as const };
}

export async function consumeMemberSignInToken(tenantSlug: string, rawToken: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return { ok: false as const, error: "Tenant not found" };
  }

  const tokenHash = hashMemberToken(rawToken);
  const loginToken = await prisma.contactLoginToken.findUnique({
    where: { tokenHash },
  });

  if (
    !loginToken ||
    loginToken.tenantId !== tenant.id ||
    loginToken.consumedAt ||
    loginToken.expiresAt < new Date()
  ) {
    return { ok: false as const, error: "Invalid or expired link" };
  }

  const rawSessionToken = generateMemberToken();

  await prisma.$transaction([
    prisma.contactLoginToken.update({
      where: { id: loginToken.id },
      data: { consumedAt: new Date() },
    }),
    prisma.contactSession.create({
      data: {
        tenantId: tenant.id,
        contactId: loginToken.contactId,
        tokenHash: hashMemberToken(rawSessionToken),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    }),
  ]);

  return { ok: true as const, tenantSlug: tenant.slug, sessionToken: rawSessionToken };
}

export async function getCurrentMemberContact(tenantSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return null;

  const rawToken = await getMemberSessionCookie();
  if (!rawToken) return null;

  const session = await prisma.contactSession.findUnique({
    where: { tokenHash: hashMemberToken(rawToken) },
    include: { contact: true },
  });

  if (
    !session ||
    session.tenantId !== tenant.id ||
    session.revokedAt ||
    session.expiresAt < new Date()
  ) {
    return null;
  }

  return { tenant, session, contact: session.contact };
}

export async function signOutMember(tenantSlug: string) {
  const current = await getCurrentMemberContact(tenantSlug);
  if (current) {
    await prisma.contactSession.update({
      where: { id: current.session.id },
      data: { revokedAt: new Date() },
    });
  }
  await clearMemberSessionCookie();
  return { ok: true as const };
}

export async function updateMemberProfile(input: unknown) {
  const parsed = UpdateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const current = await getCurrentMemberContact(parsed.data.tenantSlug);
  if (!current) {
    return { ok: false as const, error: "Not signed in" };
  }

  const contact = await prisma.contact.update({
    where: { id: current.contact.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || null,
    },
  });

  return { ok: true as const, contact };
}
