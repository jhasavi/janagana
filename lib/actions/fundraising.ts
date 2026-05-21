'use server'

import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { sendDonationReceiptEmail } from '@/lib/email'

const CampaignSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  goalCents: z.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED']).default('DRAFT'),
  endDate: z.string().optional().nullable(),
})

const PublicDonationCheckoutSchema = z.object({
  donorName: z.string().trim().min(1, 'Name is required').max(120),
  donorEmail: z.string().trim().email('Valid email required'),
  amountCents: z.number().int().min(100, 'Minimum donation is $1'),
  message: z.string().trim().max(1000).optional(),
  isAnonymous: z.boolean().optional().default(false),
})

function getStripe() {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }

  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
  })
}

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
}

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
        tenant: { select: { slug: true } },
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

// ─── PUBLIC CAMPAIGNS ───────────────────────────────────────────────────────

export async function getPublicCampaigns(slug: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true },
    })
    if (!tenant) return { success: false, error: 'Organization not found', data: null }

    const campaigns = await prisma.donationCampaign.findMany({
      where: { tenantId: tenant.id, status: 'ACTIVE' },
      include: { _count: { select: { donations: true } } },
      orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
    })

    return { success: true, data: { tenant, campaigns } }
  } catch (error) {
    console.error('[getPublicCampaigns]', error)
    return { success: false, error: 'Failed to load campaigns', data: null }
  }
}

export async function getPublicCampaign(slug: string, campaignId: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true },
    })
    if (!tenant) return { success: false, error: 'Organization not found', data: null }

    const campaign = await prisma.donationCampaign.findFirst({
      where: { id: campaignId, tenantId: tenant.id, status: 'ACTIVE' },
      include: { _count: { select: { donations: true } } },
    })
    if (!campaign) return { success: false, error: 'Campaign not found', data: null }

    return { success: true, data: { tenant, campaign } }
  } catch (error) {
    console.error('[getPublicCampaign]', error)
    return { success: false, error: 'Failed to load campaign', data: null }
  }
}

export async function createDonationCheckoutSession(slug: string, campaignId: string, input: unknown) {
  try {
    const data = PublicDonationCheckoutSchema.parse(input)
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    })
    if (!tenant) return { success: false, error: 'Organization not found' }

    const campaign = await prisma.donationCampaign.findFirst({
      where: { id: campaignId, tenantId: tenant.id, status: 'ACTIVE' },
      select: { id: true, title: true, description: true },
    })
    if (!campaign) return { success: false, error: 'Campaign not found' }

    const donation = await prisma.donation.create({
      data: {
        tenantId: tenant.id,
        campaignId: campaign.id,
        donorName: data.donorName,
        donorEmail: data.donorEmail,
        amountCents: data.amountCents,
        message: data.message || undefined,
        isAnonymous: data.isAnonymous,
        status: 'PENDING',
      },
    })

    const stripe = getStripe()
    const baseUrl = getAppBaseUrl()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: data.donorEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: data.amountCents,
            product_data: {
              name: `Donation: ${campaign.title}`,
              description: campaign.description ?? undefined,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenantId: tenant.id,
        campaignId: campaign.id,
        donationId: donation.id,
        donationType: 'campaign',
      },
      success_url: `${baseUrl}/fundraising/${tenant.slug}/${campaign.id}?donation=success`,
      cancel_url: `${baseUrl}/fundraising/${tenant.slug}/${campaign.id}?donation=cancelled`,
    })

    return { success: true, url: session.url }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid donation' }
    }
    console.error('[createDonationCheckoutSession]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to start donation checkout' }
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

    let resolvedContactId = data.contactId

    // Auto-link by donor email if contactId not provided
    if (!resolvedContactId && data.donorEmail) {
      const byEmail = await prisma.contact.findFirst({
        where: {
          tenantId: tenant.id,
          emails: { has: data.donorEmail },
        },
      })
      if (byEmail) {
        resolvedContactId = byEmail.id
      } else {
        // Create a minimal Contact for the donor
        const [firstName, ...rest] = (data.donorName ?? '').trim().split(' ')
        const created = await prisma.contact.create({
          data: {
            tenantId: tenant.id,
            firstName: firstName ?? '',
            lastName: rest.join(' ') || '',
            emails: [data.donorEmail],
            lifecycleStage: 'DONOR',
            source: 'donation',
          },
        })
        resolvedContactId = created.id
      }
    }

    // If contactId provided explicitly, verify it belongs to tenant
    if (data.contactId && data.contactId !== resolvedContactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: data.contactId, tenantId: tenant.id },
      })
      if (!contact) return { success: false, error: 'Contact not found' }
    }

    const donation = await prisma.donation.create({
      data: { ...data, contactId: resolvedContactId, tenantId: tenant.id, status: 'COMPLETED' },
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

export async function resendDonationReceipt(donationId: string) {
  try {
    const tenant = await requireTenant()
    const donation = await prisma.donation.findFirst({
      where: { id: donationId, tenantId: tenant.id },
      include: {
        campaign: { select: { title: true } },
        tenant: { select: { name: true, donationReceiptFooter: true, donationReceiptDisclaimer: true, slug: true } },
      },
    })

    if (!donation) return { success: false, error: 'Donation not found' }
    if (donation.status !== 'COMPLETED') return { success: false, error: 'Only completed donations can have receipts resent' }

    await sendDonationReceiptEmail({
      to: donation.donorEmail,
      donorName: donation.donorName,
      orgName: donation.tenant.name,
      campaignTitle: donation.campaign?.title,
      amountCents: donation.amountCents,
      footer: donation.tenant.donationReceiptFooter,
      disclaimer: donation.tenant.donationReceiptDisclaimer,
    })

    return { success: true }
  } catch (e) {
    console.error('[resendDonationReceipt]', e)
    return { success: false, error: 'Failed to resend receipt' }
  }
}
