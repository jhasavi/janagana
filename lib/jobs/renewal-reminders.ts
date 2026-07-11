import type { PrismaClient } from "@prisma/client";
import { queueRenewalReminderCommunication } from "@/lib/communications/outbox";
import { hasUsableEmail } from "@/lib/memberships/renewals";

export type RenewalReminderJobResult = {
  queued: number;
  skipped: number;
  dryRun: boolean;
};

export async function runRenewalReminderJob(
  prisma: PrismaClient,
  options?: { tenantSlug?: string; dryRun?: boolean },
): Promise<RenewalReminderJobResult> {
  const tenantSlug = options?.tenantSlug;
  const dryRun = Boolean(options?.dryRun);

  const tenants = tenantSlug
    ? await prisma.tenant.findMany({ where: { slug: tenantSlug, status: "ACTIVE" } })
    : await prisma.tenant.findMany({ where: { status: "ACTIVE" } });

  if (tenants.length === 0) {
    throw new Error(tenantSlug ? `Active tenant not found: ${tenantSlug}` : "No active tenants");
  }

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 90);
  const cooldown = new Date(now);
  cooldown.setDate(cooldown.getDate() - 7);

  let queued = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const memberships = await prisma.membership.findMany({
      where: {
        tenantId: tenant.id,
        status: "ACTIVE",
        expiresAt: { gte: now, lte: horizon },
      },
      include: {
        contact: { select: { email: true } },
        communications: {
          where: { purpose: "RENEWAL_REMINDER" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    for (const membership of memberships) {
      if (!hasUsableEmail(membership.contact.email)) {
        skipped += 1;
        continue;
      }
      const last = membership.communications[0];
      if (last && last.createdAt >= cooldown) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        queued += 1;
        continue;
      }

      const message = await queueRenewalReminderCommunication(membership.id);
      if (message) queued += 1;
      else skipped += 1;
    }
  }

  return { queued, skipped, dryRun };
}
