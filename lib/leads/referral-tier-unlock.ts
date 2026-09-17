import type { Prisma } from "@prisma/client";
import { currentReferralTier, referralTierTag, type ReferralTier } from "@/lib/leads/referral-tiers";

export interface ReferralTierUnlock {
  tier: ReferralTier;
  ownerContactId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  recipientEmail: string;
  recipientName: string | null;
}

/**
 * Call right after flipping a ReferralRedemption to converted=true, inside the
 * same transaction. Aggregates the ambassador's total converted redemptions
 * across every code they own, and tags their Contact the first time a new
 * tier is reached. Returns non-null only on a genuinely new unlock, so the
 * caller can queue a notification once the transaction commits.
 */
export async function checkReferralTierUnlock(
  tx: Prisma.TransactionClient,
  convertedRedemptionId: string,
): Promise<ReferralTierUnlock | null> {
  const redemption = await tx.referralRedemption.findUnique({
    where: { id: convertedRedemptionId },
    select: { referralCode: { select: { ownerContactId: true } } },
  });
  const ownerContactId = redemption?.referralCode.ownerContactId;
  if (!ownerContactId) return null;

  // Lock the ambassador's own contact row — a distinct row from the referred
  // contact recomputeLeadScore already locked — so two conversions landing
  // for the same ambassador at once can't both compute a stale tag list.
  await tx.$executeRaw`SELECT id FROM "Contact" WHERE id = ${ownerContactId} FOR UPDATE`;

  const owner = await tx.contact.findUnique({
    where: { id: ownerContactId },
    select: {
      id: true,
      tenantId: true,
      email: true,
      firstName: true,
      lastName: true,
      tags: true,
      tenant: { select: { name: true, slug: true } },
      referralCodesOwned: {
        select: { redemptions: { select: { converted: true } } },
      },
    },
  });
  if (!owner) return null;

  const totalConverted = owner.referralCodesOwned.reduce(
    (sum, code) => sum + code.redemptions.filter((r) => r.converted).length,
    0,
  );

  const tier = currentReferralTier(totalConverted);
  if (!tier) return null;

  const tierTag = referralTierTag(tier);
  if (owner.tags.includes(tierTag)) return null;

  await tx.contact.update({
    where: { id: owner.id },
    data: { tags: [...owner.tags, tierTag].slice(0, 12) },
  });

  return {
    tier,
    ownerContactId: owner.id,
    tenantId: owner.tenantId,
    tenantName: owner.tenant.name,
    tenantSlug: owner.tenant.slug,
    recipientEmail: owner.email,
    recipientName: [owner.firstName, owner.lastName].filter(Boolean).join(" ") || null,
  };
}
