import { prisma } from "@/lib/prisma";
import { categoryForScore, computeLeadScore, gradeForScore, type LeadCategory, type LeadGrade } from "@/lib/leads/scoring";
import { applySegmentationRules } from "@/lib/leads/segmentation";
import { checkReferralTierUnlock, type ReferralTierUnlock } from "@/lib/leads/referral-tier-unlock";
import { queueReferralTierUnlockedCommunication } from "@/lib/communications/outbox";
import { publicPortalUrl } from "@/lib/environment";

const STALE_AFTER_DAYS = 90;

export interface RecomputedLeadScore {
  score: number;
  grade: LeadGrade;
  category: LeadCategory;
  lifecycleStage: string;
}

/**
 * Recomputes and persists a contact's lead score/lifecycle stage from its current
 * engagement signals. Best-effort: never throws, so callers can fire this after any
 * action without special error handling — a scoring failure must not break a
 * registration, donation, or membership flow.
 */
export async function recomputeLeadScore(contactId: string): Promise<RecomputedLeadScore | null> {
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      // Row-lock so two near-simultaneous triggers on the same contact (e.g. a
      // donation and an event registration landing close together) serialize
      // instead of racing on the tags/lifecycleStage read-modify-write below.
      await tx.$executeRaw`SELECT id FROM "Contact" WHERE id = ${contactId} FOR UPDATE`;

      const contact = await tx.contact.findUnique({
        where: { id: contactId },
        select: {
          id: true,
          interestType: true,
          source: true,
          lastActivityAt: true,
          lifecycleStage: true,
          tags: true,
          _count: { select: { registrations: true, communications: true } },
          memberships: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
          payments: { where: { purpose: "DONATION", status: "PAID" }, select: { id: true }, take: 1 },
          referralRedemption: { select: { id: true, converted: true } },
        },
      });
      if (!contact) return { score: null, tierUnlock: null };

      const hasMembership = contact.memberships.length > 0;
      const hasDonation = contact.payments.length > 0;
      const activityCount = contact._count.registrations + contact._count.communications;

      // A referred contact who becomes a paying member/donor converts — this is
      // the only writer of that transition, reusing every trigger already wired
      // into recomputeLeadScore instead of adding new call sites.
      let tierUnlock: ReferralTierUnlock | null = null;
      if ((hasMembership || hasDonation) && contact.referralRedemption && !contact.referralRedemption.converted) {
        await tx.referralRedemption.update({
          where: { id: contact.referralRedemption.id },
          data: { converted: true, convertedAt: new Date() },
        });
        tierUnlock = await checkReferralTierUnlock(tx, contact.referralRedemption.id);
      }

      const score = computeLeadScore({
        interestType: contact.interestType,
        source: contact.source,
        activityCount,
        lastActivityAt: contact.lastActivityAt,
        hasMembership,
        hasDonation,
      });

      const ageDays = contact.lastActivityAt
        ? (Date.now() - contact.lastActivityAt.getTime()) / (24 * 60 * 60 * 1000)
        : Infinity;
      const isStale = score === 0 && ageDays > STALE_AFTER_DAYS;

      const segmentation = applySegmentationRules({
        score,
        currentStage: contact.lifecycleStage,
        tags: contact.tags,
        hasMembership,
        hasDonation,
        isStale,
      });

      // Same cap the admin create/update forms enforce (lib/contacts/tags.ts) —
      // segmentation tags must not let a contact silently exceed it.
      const tags = segmentation.tags.slice(0, 12);

      await tx.contact.update({
        where: { id: contact.id },
        data: {
          leadScore: score,
          leadScoreUpdatedAt: new Date(),
          lifecycleStage: segmentation.lifecycleStage,
          tags,
        },
      });

      return {
        score: {
          score,
          grade: gradeForScore(score),
          category: categoryForScore(score),
          lifecycleStage: segmentation.lifecycleStage,
        },
        tierUnlock,
      };
    });

    // Notification is real network I/O — queued after the transaction commits,
    // never inside it, same as every other queue*Communication call site.
    if (outcome.tierUnlock) {
      const tierUnlock = outcome.tierUnlock;
      await queueReferralTierUnlockedCommunication({
        tenantId: tierUnlock.tenantId,
        contactId: tierUnlock.ownerContactId,
        tenantName: tierUnlock.tenantName,
        recipientEmail: tierUnlock.recipientEmail,
        recipientName: tierUnlock.recipientName,
        tierLabel: tierUnlock.tier.label,
        accountUrl: `${publicPortalUrl(tierUnlock.tenantSlug)}/account`,
      });
    }

    return outcome.score;
  } catch (error) {
    console.error("recomputeLeadScore failed", { contactId, error });
    return null;
  }
}
