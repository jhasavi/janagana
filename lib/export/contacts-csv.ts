import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "@/lib/export/csv";
import { buildContactListWhere, ContactListFilterSchema } from "@/lib/contacts/list-filters";

export async function buildContactsCsv(tenantId: string, filtersInput: unknown = {}) {
  const parsed = ContactListFilterSchema.safeParse(filtersInput);
  const filters = parsed.success ? parsed.data : {};
  const where = buildContactListWhere(tenantId, filters);

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
    include: {
      _count: { select: { registrations: true } },
    },
  });

  const headers = [
    "createdAt",
    "firstName",
    "lastName",
    "email",
    "phone",
    "type",
    "source",
    "interestType",
    "tags",
    "registrationCount",
    "notes",
  ];

  const rows = contacts.map((c) => [
    c.createdAt.toISOString(),
    c.firstName,
    c.lastName,
    c.email,
    c.phone,
    c.type,
    c.source,
    c.interestType,
    c.tags.join("; "),
    c._count.registrations,
    c.notes,
  ]);

  return rowsToCsv(headers, rows);
}
