import { z } from "zod";
import { Prisma } from "@prisma/client";

export const ContactListFilterSchema = z
  .object({
    q: z.string().trim().max(120).optional().or(z.literal("")),
    source: z.string().trim().max(80).optional().or(z.literal("")),
    interestType: z.string().trim().max(80).optional().or(z.literal("")),
    tag: z.string().trim().max(80).optional().or(z.literal("")),
    lifecycleStage: z
      .enum(["NEW", "ENGAGED", "QUALIFIED", "CONVERTED", "LOST"])
      .optional()
      .or(z.literal("")),
    membershipStatus: z
      .enum(["PENDING", "ACTIVE", "INACTIVE", "EXPIRED", "CANCELED"])
      .optional()
      .or(z.literal("")),
    preset: z
      .enum(["members", "volunteers", "donors", "leads", "no-email", "recent", "no-household"])
      .optional()
      .or(z.literal("")),
  })
  .strict();

export type ContactListFilters = z.infer<typeof ContactListFilterSchema>;

export function buildContactListWhere(tenantId: string, filters: ContactListFilters): Prisma.ContactWhereInput {
  const and: Prisma.ContactWhereInput[] = [{ tenantId }];

  if (filters.q) {
    and.push({
      OR: [
        { firstName: { contains: filters.q, mode: "insensitive" } },
        { lastName: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { phone: { contains: filters.q, mode: "insensitive" } },
        { notes: { contains: filters.q, mode: "insensitive" } },
        { tags: { has: filters.q } },
      ],
    });
  }

  if (filters.source) {
    and.push({ source: filters.source });
  }

  if (filters.interestType) {
    and.push({ interestType: filters.interestType });
  }

  if (filters.tag) {
    and.push({ tags: { has: filters.tag } });
  }

  if (filters.lifecycleStage) {
    and.push({ lifecycleStage: filters.lifecycleStage });
  }

  if (filters.membershipStatus) {
    and.push({ memberships: { some: { status: filters.membershipStatus } } });
  }

  if (filters.preset === "members") {
    and.push({
      OR: [{ type: "MEMBER" }, { memberships: { some: { status: "ACTIVE" } } }],
    });
  } else if (filters.preset === "volunteers") {
    and.push({ type: "VOLUNTEER" });
  } else if (filters.preset === "donors") {
    and.push({ type: "DONOR" });
  } else if (filters.preset === "leads") {
    and.push({ type: "OTHER" });
  } else if (filters.preset === "no-email") {
    and.push({
      OR: [
        { email: "" },
        { email: { not: { contains: "@" } } },
        { email: { endsWith: "@example.com", mode: "insensitive" } },
      ],
    });
  } else if (filters.preset === "recent") {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    and.push({ lastActivityAt: { gte: since } });
  } else if (filters.preset === "no-household") {
    and.push({ householdId: null });
  }

  return and.length === 1 ? and[0]! : { AND: and };
}

export function contactListQueryString(filters: Partial<ContactListFilters>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function contactExportHref(filters: Partial<ContactListFilters>): string {
  return `/api/export/contacts${contactListQueryString(filters)}`;
}

export function hasActiveContactFilters(filters: Partial<ContactListFilters>): boolean {
  return Boolean(
    filters.q ||
      filters.source ||
      filters.interestType ||
      filters.tag ||
      filters.lifecycleStage ||
      filters.membershipStatus ||
      filters.preset,
  );
}
