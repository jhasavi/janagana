import type { PrismaClient } from "@prisma/client";

export const QA_EMAIL_PATTERN = /^(qa-prod-|qa-prod-vercel-|qa-smoke-|test-production-)/i;

export async function findQaContacts(prisma: PrismaClient) {
  const candidates = await prisma.contact.findMany({
    where: {
      OR: [
        { email: { startsWith: "qa-prod-", mode: "insensitive" } },
        { email: { startsWith: "qa-prod-vercel-", mode: "insensitive" } },
        { email: { startsWith: "qa-smoke-", mode: "insensitive" } },
        { email: { startsWith: "test-production-", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      email: true,
      tenantId: true,
      createdAt: true,
      tenant: { select: { slug: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return candidates.filter((c) => QA_EMAIL_PATTERN.test(c.email));
}

export async function deleteQaContacts(prisma: PrismaClient, contacts: { id: string; email: string }[]) {
  const deleted: string[] = [];
  for (const c of contacts) {
    await prisma.eventRegistration.deleteMany({ where: { contactId: c.id } });
    await prisma.membership.deleteMany({ where: { contactId: c.id } });
    await prisma.contact.delete({ where: { id: c.id } });
    deleted.push(c.email);
  }
  return deleted;
}
