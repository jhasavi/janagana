import type { PrismaClient } from "@prisma/client";
import { recomputeLeadScore } from "@/lib/leads/scoring-actions";

export type RecomputeStaleLeadsJobResult = {
  recomputed: number;
  tenantsScanned: number;
};

/**
 * recomputeLeadScore only runs when a contact is actively touched (registration,
 * donation, etc.), each of which sets lastActivityAt to "now" in the same write —
 * so the staleness/LOST decay in lib/leads/segmentation.ts never fires on its own.
 * This job re-evaluates contacts that have gone quiet so LOST/cold-lead can actually
 * apply. See docs/16-LEAD-INTELLIGENCE-PLAN.md.
 */
export async function runRecomputeStaleLeadsJob(
  prisma: PrismaClient,
  options?: { tenantSlug?: string; staleAfterDays?: number },
): Promise<RecomputeStaleLeadsJobResult> {
  const staleAfterDays = options?.staleAfterDays ?? 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleAfterDays);

  const tenants = options?.tenantSlug
    ? await prisma.tenant.findMany({ where: { slug: options.tenantSlug, status: "ACTIVE" } })
    : await prisma.tenant.findMany({ where: { status: "ACTIVE" } });

  let recomputed = 0;

  for (const tenant of tenants) {
    const staleContacts = await prisma.contact.findMany({
      where: {
        tenantId: tenant.id,
        lifecycleStage: { notIn: ["CONVERTED", "LOST"] },
        OR: [{ lastActivityAt: { lt: cutoff } }, { lastActivityAt: null, createdAt: { lt: cutoff } }],
      },
      select: { id: true },
    });

    for (const contact of staleContacts) {
      await recomputeLeadScore(contact.id);
      recomputed += 1;
    }
  }

  return { recomputed, tenantsScanned: tenants.length };
}
