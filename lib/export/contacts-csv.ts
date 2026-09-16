import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "@/lib/export/csv";
import { buildContactListWhere, ContactListFilterSchema } from "@/lib/contacts/list-filters";
import { categoryForScore, gradeForScore } from "@/lib/leads/scoring";

export async function buildContactsCsv(tenantId: string, filtersInput: unknown = {}) {
  const parsed = ContactListFilterSchema.safeParse(filtersInput);
  const filters = parsed.success ? parsed.data : {};
  const where = buildContactListWhere(tenantId, filters);

  const [contacts, customFieldDefinitions] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { email: "asc" }],
      include: {
        _count: { select: { registrations: true } },
      },
    }),
    prisma.customFieldDefinition.findMany({
      where: { tenantId, active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

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
    "leadScore",
    "leadGrade",
    "leadCategory",
    "lifecycleStage",
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "referredByCode",
    "notes",
    ...customFieldDefinitions.map((def) => def.label),
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
    c.leadScore,
    gradeForScore(c.leadScore),
    categoryForScore(c.leadScore),
    c.lifecycleStage,
    c.utmSource,
    c.utmMedium,
    c.utmCampaign,
    c.referredByCode,
    c.notes,
    ...customFieldDefinitions.map((def) => {
      const value = (c.customFieldValues as Record<string, unknown> | null)?.[def.key];
      return value === undefined || value === null ? "" : String(value);
    }),
  ]);

  return rowsToCsv(headers, rows);
}
