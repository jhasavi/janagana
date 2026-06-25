import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { queueRenewalReminderCommunication } from "@/lib/communications/outbox";
import {
  RENEWAL_REMINDER_COOLDOWN_DAYS,
  classifyMembershipRenewal,
  hasUsableEmail,
} from "@/lib/memberships/renewals";
import { requireActiveTenantForActions, type TenantActionOptions } from "@/lib/tenant";

export { hasUsableEmail };

const QueueRenewalReminderSchema = z
  .object({
    membershipId: z.string().trim().min(1),
  })
  .strict();

export async function queueMembershipRenewalReminder(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  const context = auth.context;

  const parsed = QueueRenewalReminderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await prisma.membership.findFirst({
    where: { id: parsed.data.membershipId, tenantId: context.tenant.id },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      tier: { select: { name: true, amountCents: true, interval: true } },
      payments: {
        where: { purpose: "MEMBERSHIP" },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        select: { amountCents: true, status: true, paidAt: true, createdAt: true },
        take: 5,
      },
      communications: {
        where: { purpose: "RENEWAL_REMINDER" },
        orderBy: { createdAt: "desc" },
        select: { purpose: true, status: true, createdAt: true },
        take: 5,
      },
    },
  });

  if (!membership) {
    return { ok: false as const, error: "Membership not found" };
  }

  if (!hasUsableEmail(membership.contact.email)) {
    return { ok: false as const, error: "Contact has no usable email for a renewal reminder" };
  }

  const row = classifyMembershipRenewal(membership);
  if (row.reminderStatus === "recently_queued") {
    return {
      ok: false as const,
      error: `A renewal reminder was already queued in the last ${RENEWAL_REMINDER_COOLDOWN_DAYS} days`,
    };
  }

  const message = await queueRenewalReminderCommunication(membership.id);
  if (!message) {
    return { ok: false as const, error: "Failed to queue renewal reminder" };
  }

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "CREATE",
      metadata: {
        entity: "CommunicationMessage",
        purpose: "RENEWAL_REMINDER",
        membershipId: membership.id,
        contactId: membership.contactId,
        messageId: message.id,
      },
    },
  });

  return { ok: true as const, data: { messageId: message.id } };
}
