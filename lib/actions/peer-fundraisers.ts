import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getTenantBySlug } from "@/lib/tenant";
import { getCurrentMemberContact } from "@/lib/actions/member-auth";

export const PeerFundraiserCreateSchema = z
  .object({
    tenantSlug: z.string().trim().min(1),
    campaignId: z.string().trim().min(1),
    title: z.string().trim().max(200).optional().or(z.literal("")),
    story: z.string().trim().max(5000).optional().or(z.literal("")),
    goalDollars: z.number().min(0).optional(),
  })
  .strict();

async function raisedCentsForFundraiser(fundraiserId: string) {
  const result = await prisma.paymentRecord.aggregate({
    where: { peerFundraiserId: fundraiserId, status: "PAID" },
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}

async function generateFundraiserSlug(tenantId: string, seed: string) {
  const baseSlug = slugify(seed) || "fundraiser";
  let slug = baseSlug;
  let idx = 1;

  while (slug.length > 0) {
    const existing = await prisma.peerFundraiser.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
      select: { id: true },
    });
    if (!existing) return slug;
    idx += 1;
    slug = `${baseSlug}-${idx}`;
  }

  return null;
}

/**
 * Self-serve: a signed-in member/donor (magic-link Contact session) starts
 * their own fundraising page for a published Campaign — Zeffy-style P2P
 * fundraising. One page per contact per campaign.
 */
export async function createPeerFundraiser(input: unknown) {
  const parsed = PeerFundraiserCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid fundraiser input" };
  }

  const current = await getCurrentMemberContact(parsed.data.tenantSlug);
  if (!current) {
    return { ok: false as const, error: "Sign in to your account first" };
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: parsed.data.campaignId, tenantId: current.tenant.id, status: "PUBLISHED" },
    select: { id: true, title: true },
  });
  if (!campaign) {
    return { ok: false as const, error: "Campaign not found or not open for fundraising" };
  }

  const existing = await prisma.peerFundraiser.findFirst({
    where: { tenantId: current.tenant.id, campaignId: campaign.id, ownerContactId: current.contact.id },
  });
  if (existing) {
    return { ok: true as const, data: existing, alreadyExisted: true as const };
  }

  const seed = parsed.data.title || `${current.contact.firstName} ${current.contact.lastName} ${campaign.title}`;
  const slug = await generateFundraiserSlug(current.tenant.id, seed);
  if (!slug) {
    return { ok: false as const, error: "Unable to generate a fundraising page link" };
  }

  const fundraiser = await prisma.peerFundraiser.create({
    data: {
      tenantId: current.tenant.id,
      campaignId: campaign.id,
      ownerContactId: current.contact.id,
      slug,
      title: parsed.data.title || null,
      story: parsed.data.story || null,
      goalCents: parsed.data.goalDollars ? Math.round(parsed.data.goalDollars * 100) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: current.tenant.id,
      actorUserId: null,
      action: "CREATE",
      metadata: {
        entity: "PeerFundraiser",
        peerFundraiserId: fundraiser.id,
        campaignId: campaign.id,
        contactId: current.contact.id,
        source: "self_serve",
      },
    },
  });

  return { ok: true as const, data: fundraiser, alreadyExisted: false as const };
}

/** Self-serve: fundraising pages owned by the currently signed-in member. */
export async function getMyPeerFundraisers(tenantSlug: string) {
  const current = await getCurrentMemberContact(tenantSlug);
  if (!current) {
    return { ok: false as const, error: "Not signed in", data: [] as any[] };
  }

  const fundraisers = await prisma.peerFundraiser.findMany({
    where: { tenantId: current.tenant.id, ownerContactId: current.contact.id },
    include: { campaign: { select: { id: true, title: true, slug: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  const data = await Promise.all(
    fundraisers.map(async (fundraiser) => ({
      ...fundraiser,
      raisedCents: await raisedCentsForFundraiser(fundraiser.id),
    })),
  );

  return { ok: true as const, data };
}

/**
 * Public-safe fundraiser lookup by tenant slug + fundraiser slug — no auth.
 * Powers the shareable personal fundraising page.
 */
export async function getPublicPeerFundraiser(tenantSlug: string, fundraiserSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { ok: false as const, error: "Community not found", data: null };

  const fundraiser = await prisma.peerFundraiser.findFirst({
    where: { tenantId: tenant.id, slug: fundraiserSlug, active: true },
    include: {
      campaign: { select: { id: true, title: true, slug: true, status: true, goalCents: true } },
      owner: { select: { firstName: true, lastName: true } },
    },
  });

  if (!fundraiser || fundraiser.campaign.status !== "PUBLISHED") {
    return { ok: false as const, error: "Fundraising page not found", data: null };
  }

  return {
    ok: true as const,
    tenant,
    data: { ...fundraiser, raisedCents: await raisedCentsForFundraiser(fundraiser.id) },
  };
}
