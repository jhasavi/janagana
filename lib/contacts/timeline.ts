import { contactInterestLabel } from "@/lib/pilot/contact-labels";
import { formatCents } from "@/lib/utils";

export type TimelineEventKind =
  | "created"
  | "imported"
  | "membership"
  | "registration"
  | "payment"
  | "communication";

export type TimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  at: Date;
  title: string;
  detail: string;
  href?: string;
};

type ContactForTimeline = {
  id: string;
  createdAt: Date;
  importedAt: Date | null;
  source: string | null;
  interestType: string | null;
  memberships: Array<{
    id: string;
    startsAt: Date;
    status: string;
    tier: { name: string };
  }>;
  registrations: Array<{
    id: string;
    createdAt: Date;
    status: string;
    event: { id: string; title: string };
  }>;
  payments: Array<{
    id: string;
    purpose: string;
    status: string;
    amountCents: number;
    paidAt: Date | null;
    createdAt: Date;
    receipt: { id: string; receiptNumber: string } | null;
  }>;
  communications: Array<{
    id: string;
    purpose: string;
    status: string;
    subject: string;
    sentAt: Date | null;
    createdAt: Date;
  }>;
};

function purposeLabel(purpose: string): string {
  switch (purpose) {
    case "MEMBERSHIP":
      return "Membership";
    case "EVENT":
      return "Event";
    case "DONATION":
      return "Donation";
    default:
      return "Payment";
  }
}

function communicationPurposeLabel(purpose: string): string {
  switch (purpose) {
    case "PAYMENT_RECEIPT":
      return "Receipt sent";
    case "EVENT_CONFIRMATION":
      return "Event confirmation sent";
    case "EVENT_REMINDER":
      return "Event reminder sent";
    case "RENEWAL_REMINDER":
      return "Renewal reminder sent";
    default:
      return "Message sent";
  }
}

/** Merge every touchpoint on a contact record into one chronological timeline. */
export function buildContactTimeline(contact: ContactForTimeline): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: `created:${contact.id}`,
    kind: contact.importedAt ? "imported" : "created",
    at: contact.importedAt ?? contact.createdAt,
    title: contact.importedAt ? "Imported into CRM" : "Added to CRM",
    detail: contact.interestType
      ? `Source: ${contact.source ?? "unknown"} · ${contactInterestLabel(contact.interestType)}`
      : `Source: ${contact.source ?? "unknown"}`,
  });

  for (const membership of contact.memberships) {
    events.push({
      id: `membership:${membership.id}`,
      kind: "membership",
      at: membership.startsAt,
      title: `Enrolled — ${membership.tier.name}`,
      detail: `Status: ${membership.status}`,
      href: "/dashboard/tiers",
    });
  }

  for (const registration of contact.registrations) {
    events.push({
      id: `registration:${registration.id}`,
      kind: "registration",
      at: registration.createdAt,
      title: `Registered — ${registration.event.title}`,
      detail: `Status: ${registration.status}`,
      href: `/dashboard/events/${registration.event.id}/registrations`,
    });
  }

  for (const payment of contact.payments) {
    events.push({
      id: `payment:${payment.id}`,
      kind: "payment",
      at: payment.paidAt ?? payment.createdAt,
      title: `${purposeLabel(payment.purpose)} payment — ${formatCents(payment.amountCents)}`,
      detail: `Status: ${payment.status}${payment.receipt ? ` · Receipt ${payment.receipt.receiptNumber}` : ""}`,
      href: payment.receipt ? `/dashboard/payments/receipts/${payment.receipt.id}` : undefined,
    });
  }

  for (const message of contact.communications) {
    events.push({
      id: `communication:${message.id}`,
      kind: "communication",
      at: message.sentAt ?? message.createdAt,
      title: communicationPurposeLabel(message.purpose),
      detail: `${message.subject} · ${message.status}`,
      href: "/dashboard/communications",
    });
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}
