export type ActivityItemType = "contact" | "registration" | "payment" | "communication";

export type ActivityItem = {
  id: string;
  type: ActivityItemType;
  title: string;
  detail: string;
  timestamp: Date;
  href: string;
};

type RecentContact = {
  id: string;
  firstName: string;
  lastName: string;
  lastActivitySummary: string | null;
  createdAt: Date;
};

type RecentRegistration = {
  id: string;
  createdAt: Date;
  event: { id: string; title: string };
  contact: { firstName: string; lastName: string };
};

type RecentPayment = {
  id: string;
  amountCents: number;
  purpose: string;
  paidAt: Date | null;
  createdAt: Date;
  contact: { firstName: string; lastName: string } | null;
};

type RecentCommunication = {
  id: string;
  subject: string;
  recipientName: string | null;
  recipientEmail: string;
  sentAt: Date | null;
  createdAt: Date;
};

function formatCentsShort(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Merges contacts/registrations/payments/communications into one reverse-chronological feed. */
export function buildActivityFeed(input: {
  recentContacts: RecentContact[];
  recentRegistrations: RecentRegistration[];
  recentPayments: RecentPayment[];
  recentCommunications: RecentCommunication[];
  limit?: number;
}): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const c of input.recentContacts) {
    items.push({
      id: `contact-${c.id}`,
      type: "contact",
      title: `${c.firstName} ${c.lastName}`,
      detail: c.lastActivitySummary ?? "New contact",
      timestamp: c.createdAt,
      href: `/dashboard/members/${c.id}`,
    });
  }

  for (const r of input.recentRegistrations) {
    items.push({
      id: `registration-${r.id}`,
      type: "registration",
      title: `${r.contact.firstName} ${r.contact.lastName} registered`,
      detail: r.event.title,
      timestamp: r.createdAt,
      href: `/dashboard/events/${r.event.id}/registrations`,
    });
  }

  for (const p of input.recentPayments) {
    items.push({
      id: `payment-${p.id}`,
      type: "payment",
      title: p.contact ? `${p.contact.firstName} ${p.contact.lastName}` : "Payment received",
      detail: `${formatCentsShort(p.amountCents)} · ${p.purpose.toLowerCase()}`,
      timestamp: p.paidAt ?? p.createdAt,
      href: "/dashboard/payments",
    });
  }

  for (const m of input.recentCommunications) {
    items.push({
      id: `communication-${m.id}`,
      type: "communication",
      title: m.subject,
      detail: `Sent to ${m.recipientName ?? m.recipientEmail}`,
      timestamp: m.sentAt ?? m.createdAt,
      href: "/dashboard/communications",
    });
  }

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, input.limit ?? 15);
}
