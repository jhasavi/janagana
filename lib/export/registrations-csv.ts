import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "@/lib/export/csv";

export async function buildEventRegistrationsCsv(tenantId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { id: true, title: true, slug: true },
  });
  if (!event) return null;

  const registrations = await prisma.eventRegistration.findMany({
    where: { tenantId, eventId },
    orderBy: { createdAt: "desc" },
    include: {
      contact: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
      ticketType: { select: { name: true } },
    },
  });

  const headers = [
    "registeredAt",
    "status",
    "firstName",
    "lastName",
    "email",
    "phone",
    "ticketType",
    "quantity",
    "amountCents",
    "checkedInAt",
  ];

  const rows = registrations.map((r) => [
    r.createdAt.toISOString(),
    r.status,
    r.contact.firstName,
    r.contact.lastName,
    r.contact.email,
    r.contact.phone,
    r.ticketType?.name ?? "General admission",
    r.quantity,
    r.amountCents,
    r.checkedInAt?.toISOString() ?? "",
  ]);

  return { csv: rowsToCsv(headers, rows), event };
}
