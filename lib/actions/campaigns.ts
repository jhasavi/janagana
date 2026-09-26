import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getTenantBySlug, requireActiveTenantForActions, requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";

export const CampaignCreateSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    goalDollars: z.number().min(0).optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  })
  .strict();

export const CampaignStatusUpdateSchema = z
  .object({
    campaignId: z.string().trim().min(1),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  })
  .strict();

async function generateCampaignSlug(tenantId: string, title: string) {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let idx = 1;

  while (slug.length > 0) {
    const existing = await prisma.campaign.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
      select: { id: true },
    });
    if (!existing) return slug;
    idx += 1;
    slug = `${baseSlug}-${idx}`;
  }

  return null;
}

async function raisedCentsForCampaigns(campaignIds: string[]) {
  if (campaignIds.length === 0) return new Map<string, number>();
  const rows = await prisma.paymentRecord.groupBy({
    by: ["campaignId"],
    where: { campaignId: { in: campaignIds }, status: "PAID" },
    _sum: { amountCents: true },
  });
  return new Map(rows.map((row) => [row.campaignId as string, row._sum.amountCents ?? 0]));
}

async function raisedCentsForFundraisers(fundraiserIds: string[]) {
  if (fundraiserIds.length === 0) return new Map<string, number>();
  const rows = await prisma.paymentRecord.groupBy({
    by: ["peerFundraiserId"],
    where: { peerFundraiserId: { in: fundraiserIds }, status: "PAID" },
    _sum: { amountCents: true },
  });
  return new Map(rows.map((row) => [row.peerFundraiserId as string, row._sum.amountCents ?? 0]));
}

export async function createCampaign(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const context = auth.context;

  const parsed = CampaignCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid campaign input" };
  }

  const slug = await generateCampaignSlug(context.tenant.id, parsed.data.title);
  if (!slug) {
    return { ok: false as const, error: "Unable to generate a valid campaign slug" };
  }

  const campaign = await prisma.campaign.create({
    data: {
      tenantId: context.tenant.id,
      title: parsed.data.title,
      slug,
      description: parsed.data.description || null,
      goalCents: parsed.data.goalDollars ? Math.round(parsed.data.goalDollars * 100) : null,
      status: parsed.data.status,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "CREATE",
      metadata: { entity: "Campaign", campaignId: campaign.id },
    },
  });

  return { ok: true as const, data: campaign };
}

export async function updateCampaignStatus(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const context = auth.context;

  const parsed = CampaignStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.campaign.findFirst({
    where: { id: parsed.data.campaignId, tenantId: context.tenant.id },
    select: { id: true },
  });
  if (!existing) return { ok: false as const, error: "Campaign not found" };

  await prisma.campaign.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      action: "UPDATE",
      metadata: { entity: "Campaign", campaignId: existing.id, change: `status_to_${parsed.data.status}` },
    },
  });

  return { ok: true as const };
}

/** Admin list — includes draft/archived campaigns and live raised totals. */
export async function listCampaigns() {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) return { ok: false as const, error: auth.error, data: [] as any[] };
  const context = auth.context;

  const campaigns = await prisma.campaign.findMany({
    where: { tenantId: context.tenant.id },
    include: { _count: { select: { fundraisers: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const raisedByCampaign = await raisedCentsForCampaigns(campaigns.map((c) => c.id));

  const data = campaigns.map((campaign) => ({
    ...campaign,
    raisedCents: raisedByCampaign.get(campaign.id) ?? 0,
    fundraiserCount: campaign._count.fundraisers,
  }));

  return { ok: true as const, data };
}

/**
 * Public-safe campaign lookup by tenant slug + campaign slug — no auth.
 * Only ever returns a PUBLISHED campaign, with live raised totals and its
 * fundraiser leaderboard (each with their own live raised total).
 */
export async function getPublicCampaign(tenantSlug: string, campaignSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { ok: false as const, error: "Community not found", data: null };

  const campaign = await prisma.campaign.findFirst({
    where: { tenantId: tenant.id, slug: campaignSlug, status: "PUBLISHED" },
    include: {
      fundraisers: {
        where: { active: true },
        include: { owner: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign) return { ok: false as const, error: "Campaign not found", data: null };

  const [campaignRaised, fundraiserRaised] = await Promise.all([
    raisedCentsForCampaigns([campaign.id]),
    raisedCentsForFundraisers(campaign.fundraisers.map((f) => f.id)),
  ]);

  return {
    ok: true as const,
    tenant,
    data: {
      ...campaign,
      raisedCents: campaignRaised.get(campaign.id) ?? 0,
      fundraisers: campaign.fundraisers.map((fundraiser) => ({
        ...fundraiser,
        raisedCents: fundraiserRaised.get(fundraiser.id) ?? 0,
      })),
    },
  };
}

/** Public-safe list of a tenant's published campaigns, with live raised totals. */
export async function getPublicCampaigns(tenantSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { ok: false as const, error: "Community not found", data: [] as any[] };

  const campaigns = await prisma.campaign.findMany({
    where: { tenantId: tenant.id, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  const raised = await raisedCentsForCampaigns(campaigns.map((c) => c.id));

  return {
    ok: true as const,
    tenant,
    data: campaigns.map((campaign) => ({ ...campaign, raisedCents: raised.get(campaign.id) ?? 0 })),
  };
}
