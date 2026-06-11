import { prisma } from "@/lib/prisma";
import { deliverCommunicationMessage } from "@/lib/communications/deliver";
import { formatCents, formatDate } from "@/lib/utils";

async function queueAndDeliver(data: Parameters<typeof prisma.communicationMessage.create>[0]["data"]) {
  const message = await prisma.communicationMessage.create({ data });
  await deliverCommunicationMessage(message.id).catch(() => null);
  return message;
}

export async function queueReceiptCommunication(receiptId: string) {
  const receipt = await prisma.paymentReceipt.findUnique({
    where: { id: receiptId },
    include: {
      tenant: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true } },
      payment: { select: { purpose: true, method: true } },
    },
  });

  if (!receipt) return null;

  const recipientName =
    receipt.recipientName ??
    [receipt.contact?.firstName, receipt.contact?.lastName].filter(Boolean).join(" ") ??
    null;

  return queueAndDeliver({
    tenantId: receipt.tenantId,
    contactId: receipt.contactId,
    membershipId: receipt.membershipId,
    receiptId: receipt.id,
    purpose: "PAYMENT_RECEIPT",
    recipientEmail: receipt.recipientEmail,
    recipientName,
    subject: `Receipt ${receipt.receiptNumber} from ${receipt.tenant.name}`,
    body: [
      `Thank you for your payment to ${receipt.tenant.name}.`,
      "",
      `Receipt: ${receipt.receiptNumber}`,
      `Amount: ${formatCents(receipt.amountCents)}`,
      `Description: ${receipt.description}`,
      `Issued: ${formatDate(receipt.issuedAt)}`,
    ].join("\n"),
  });
}

export async function queueEventRegistrationCommunication(registrationId: string) {
  const registration = await prisma.eventRegistration.findUnique({
    where: { id: registrationId },
    include: {
      tenant: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
      event: { select: { title: true, startsAt: true, location: true } },
      ticketType: { select: { name: true } },
    },
  });

  if (!registration) return null;

  const recipientName = [registration.contact.firstName, registration.contact.lastName]
    .filter(Boolean)
    .join(" ");
  const statusLine =
    registration.status === "PENDING_PAYMENT"
      ? "Your registration is saved and payment is pending."
      : "Your registration is confirmed.";

  return queueAndDeliver({
    tenantId: registration.tenantId,
    contactId: registration.contactId,
    eventId: registration.eventId,
    registrationId: registration.id,
    purpose: "EVENT_CONFIRMATION",
    recipientEmail: registration.contact.email,
    recipientName: recipientName || null,
    subject: `${registration.event.title} registration`,
    body: [
      statusLine,
      "",
      `Event: ${registration.event.title}`,
      `When: ${formatDate(registration.event.startsAt)}`,
      `Location: ${registration.event.location ?? "To be announced"}`,
      `Ticket: ${registration.ticketType?.name ?? "General admission"}`,
      `Quantity: ${registration.quantity}`,
      `Amount: ${formatCents(registration.amountCents)}`,
    ].join("\n"),
  });
}
