'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

const CampaignSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  goalCents: z.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED']).default('DRAFT'),
  endDate: z.string().optional().nullable(),
})

// ─── GET CAMPAIGNS ────────────────────────────────────────────────────────────

export async function getCampaigns() {
  try {
    const tenant = await requireTenant()
    const campaigns = await prisma.donationCampaign.findMany({
      where: { tenantId: tenant.id },
      include: { _count: { select: { donations: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: campaigns }
  } catch (e) {
    console.error('[getCampaigns]', e)
    return { success: false, error: 'Failed to load campaigns', data: [] }
  }
}

// ─── GET CAMPAIGN ─────────────────────────────────────────────────────────────

export async function getCampaign(id: string) {
  try {
    const tenant = await requireTenant()
    const campaign = await prisma.donationCampaign.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        donations: {
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { donations: true } },
      },
    })
    if (!campaign) return { success: false, error: 'Campaign not found', data: null }
    return { success: true, data: campaign }
  } catch (e) {
    console.error('[getCampaign]', e)
    return { success: false, error: 'Failed to load campaign', data: null }
  }
}

// ─── CREATE CAMPAIGN ─────────────────────────────────────────────────────────

export async function createCampaign(input: z.infer<typeof CampaignSchema>) {
  try {
    const tenant = await requireTenant()
    const data = CampaignSchema.parse(input)
    const campaign = await prisma.donationCampaign.create({
      data: {
        ...data,
        tenantId: tenant.id,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    })
    revalidatePath('/dashboard/fundraising')
    return { success: true, data: campaign }
  } catch (e) {
    console.error('[createCampaign]', e)
    return { success: false, error: 'Failed to create campaign' }
  }
}

// ─── UPDATE CAMPAIGN ─────────────────────────────────────────────────────────

export async function updateCampaign(id: string, input: Partial<z.infer<typeof CampaignSchema>>) {
  try {
    const tenant = await requireTenant()
    const existing = await prisma.donationCampaign.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Campaign not found' }
    const updated = await prisma.donationCampaign.update({
      where: { id, tenantId: tenant.id },
      data: {
        ...input,
        endDate: input.endDate ? new Date(input.endDate) : input.endDate === null ? null : undefined,
      },
    })
    revalidatePath('/dashboard/fundraising')
    revalidatePath(`/dashboard/fundraising/${id}`)
    return { success: true, data: updated }
  } catch (e) {
    console.error('[updateCampaign]', e)
    return { success: false, error: 'Failed to update campaign' }
  }
}

// ─── RECORD DONATION (admin-side) ─────────────────────────────────────────────

const DonationSchema = z.object({
  campaignId: z.string().optional(),
  contactId: z.string().optional(),
  donorName: z.string().min(1),
  donorEmail: z.string().email(),
  amountCents: z.number().int().positive(),
  message: z.string().optional(),
  isAnonymous: z.boolean().default(false),
})

export async function recordDonation(input: z.infer<typeof DonationSchema>) {
  try {
    const tenant = await requireTenant()
    const data = DonationSchema.parse(input)
    
    // If contactId provided, verify it belongs to tenant
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: data.contactId, tenantId: tenant.id },
      })
      if (!contact) return { success: false, error: 'Contact not found' }
    }
    
    const donation = await prisma.donation.create({
      data: { ...data, tenantId: tenant.id, status: 'COMPLETED' },
    })
    // update raisedCents on campaign
    if (data.campaignId) {
      await prisma.donationCampaign.update({
        where: { id: data.campaignId, tenantId: tenant.id },
        data: { raisedCents: { increment: data.amountCents } },
      })
    }
    revalidatePath('/dashboard/fundraising')
    if (data.campaignId) revalidatePath(`/dashboard/fundraising/${data.campaignId}`)
    return { success: true, data: donation }
  } catch (e) {
    console.error('[recordDonation]', e)
    return { success: false, error: 'Failed to record donation' }
  }
}
