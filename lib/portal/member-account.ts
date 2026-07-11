import { prisma } from "@/lib/prisma";
import { buildContactTimeline, type TimelineEvent } from "@/lib/contacts/timeline";

export async function getMemberAccountData(contactId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      memberships: {
        include: { tier: { select: { id: true, name: true, amountCents: true, interval: true } } },
        orderBy: { startsAt: "desc" },
      },
      registrations: {
        include: { event: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        include: { receipt: { select: { id: true, receiptNumber: true } } },
        orderBy: { createdAt: "desc" },
      },
      communications: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!contact) return null;

  // Dashboard-only links aren't reachable from the member-facing portal.
  const timeline: TimelineEvent[] = buildContactTimeline(contact).map((event) => ({
    ...event,
    href: event.href?.startsWith("/dashboard") ? undefined : event.href,
  }));

  const now = new Date();
  const activeMembership =
    contact.memberships.find((m) => m.status === "ACTIVE" && (!m.expiresAt || m.expiresAt >= now)) ??
    contact.memberships[0] ??
    null;

  return {
    contact,
    memberships: contact.memberships,
    activeMembership,
    timeline,
  };
}
