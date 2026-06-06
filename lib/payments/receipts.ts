import { prisma } from "@/lib/prisma";
import { queueReceiptCommunication } from "@/lib/communications/outbox";

function receiptNumber(paymentId: string) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `JG-${stamp}-${paymentId.slice(-8).toUpperCase()}`;
}

export async function issueReceiptForPayment(paymentId: string) {
  const payment = await prisma.paymentRecord.findUnique({
    where: { id: paymentId },
    include: {
      receipt: true,
      tenant: { select: { id: true, name: true, slug: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      membership: {
        include: {
          tier: { select: { name: true, interval: true } },
        },
      },
    },
  });

  if (!payment || payment.receipt) return payment?.receipt ?? null;
  if (payment.status !== "PAID" && payment.status !== "WAIVED") return null;
  if (!payment.contact?.email) return null;

  const recipientName = [payment.contact.firstName, payment.contact.lastName].filter(Boolean).join(" ");
  const description = payment.membership
    ? `${payment.membership.tier.name} membership (${payment.membership.tier.interval.toLowerCase()})`
    : `${payment.purpose.toLowerCase()} payment`;

  const receipt = await prisma.paymentReceipt.create({
    data: {
      tenantId: payment.tenantId,
      paymentId: payment.id,
      contactId: payment.contactId,
      membershipId: payment.membershipId,
      receiptNumber: receiptNumber(payment.id),
      recipientEmail: payment.contact.email,
      recipientName: recipientName || null,
      amountCents: payment.amountCents,
      currency: payment.currency,
      description,
    },
  });
  await queueReceiptCommunication(receipt.id);
  return receipt;
}
