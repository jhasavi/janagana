'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { MemberStatus } from '@prisma/client'

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getEmailCampaigns() {
  try {
    const tenant = await requireTenant()
    const campaigns = await prisma.emailCampaign.findMany({
      where: { tenantId: tenant.id },
      include: { _count: { select: { logs: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: campaigns }
  } catch (e) {
    console.error('[getEmailCampaigns]', e)
    return { success: false, error: 'Failed to load campaigns', data: [] }
  }
}

// ─── GET ONE ──────────────────────────────────────────────────────────────────

export async function getEmailCampaign(id: string) {
  try {
    const tenant = await requireTenant()
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id, tenantId: tenant.id },
      include: { logs: { orderBy: { sentAt: 'desc' }, take: 50 } },
    })
    if (!campaign) return { success: false, error: 'Not found', data: null }
    return { success: true, data: campaign }
  } catch (e) {
    console.error('[getEmailCampaign]', e)
    return { success: false, error: 'Failed to load campaign', data: null }
  }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

const CampaignSchema = z.object({
  name:           z.string().min(1, 'Name required').max(200),
  subject:        z.string().min(1, 'Subject required').max(500),
  htmlBody:       z.string().min(1, 'Body required'),
  status:         z.enum(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED']).default('DRAFT'),
  targetTierIds:  z.array(z.string()).default([]),
  targetStatuses: z.array(z.string()).default([]),
})

export async function createEmailCampaign(input: z.infer<typeof CampaignSchema>) {
  try {
    const tenant = await requireTenant()
    const data = CampaignSchema.parse(input)
    const campaign = await prisma.emailCampaign.create({
      data: { tenantId: tenant.id, ...data },
    })
    revalidatePath('/dashboard/communications')
    return { success: true, data: campaign }
  } catch (e) {
    console.error('[createEmailCampaign]', e)
    return { success: false, error: 'Failed to create campaign' }
  }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateEmailCampaign(
  id: string,
  input: Partial<z.infer<typeof CampaignSchema>>,
) {
  try {
    const tenant = await requireTenant()
    const existing = await prisma.emailCampaign.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Not found' }
    const updated = await prisma.emailCampaign.update({
      where: { id, tenantId: tenant.id },
      data: { ...input },
    })
    revalidatePath('/dashboard/communications')
    revalidatePath(`/dashboard/communications/${id}`)
    return { success: true, data: updated }
  } catch (e) {
    console.error('[updateEmailCampaign]', e)
    return { success: false, error: 'Failed to update campaign' }
  }
}

// ─── SEND CAMPAIGN ────────────────────────────────────────────────────────────

export async function sendEmailCampaign(campaignId: string) {
  try {
    const tenant = await requireTenant()

    const campaign = await prisma.emailCampaign.findFirst({
      where: { id: campaignId, tenantId: tenant.id },
    })
    if (!campaign) return { success: false, error: 'Campaign not found' }
    if (campaign.status === 'SENT') return { success: false, error: 'Campaign already sent' }

    // Build member audience
    const resolvedStatuses = (campaign.targetStatuses.length > 0 ? campaign.targetStatuses : ['ACTIVE']) as MemberStatus[]
    const memberWhere: Record<string, unknown> = {
      tenantId: tenant.id,
      status: { in: resolvedStatuses },
    }
    if (campaign.targetTierIds.length > 0) {
      memberWhere.tierId = { in: campaign.targetTierIds }
    }

    const members = await prisma.member.findMany({
      where: memberWhere,
      select: { id: true, email: true, firstName: true, lastName: true },
    })

    if (members.length === 0) {
      return { success: false, error: 'No recipients match the audience criteria' }
    }

    // Mark as sending
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    })

    const { sendEmail } = await import('@/lib/email')
    let sent = 0
    let failed = 0

    for (const member of members) {
      const personalizedHtml = campaign.htmlBody
        .replace(/\{\{firstName\}\}/g, member.firstName)
        .replace(/\{\{lastName\}\}/g, member.lastName)
        .replace(/\{\{email\}\}/g, member.email)

      const ok = await sendEmail({
        to: member.email,
        subject: campaign.subject,
        html: personalizedHtml,
      })

      await prisma.emailLog.create({
        data: {
          campaignId,
          email: member.email,
          status: ok ? 'sent' : 'failed',
        },
      })

      if (ok) sent++ ; else failed++
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENT', sentAt: new Date(), recipientCount: sent },
    })

    revalidatePath('/dashboard/communications')
    revalidatePath(`/dashboard/communications/${campaignId}`)

    return { success: true, data: { sent, failed, total: members.length } }
  } catch (e) {
    console.error('[sendEmailCampaign]', e)
    // Roll back status to DRAFT on error
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'FAILED' },
    }).catch(() => {})
    return { success: false, error: 'Failed to send campaign' }
  }
}

// ─── PREVIEW AUDIENCE ─────────────────────────────────────────────────────────

export async function previewCampaignAudience(opts: {
  targetTierIds: string[]
  targetStatuses: string[]
}) {
  try {
    const tenant = await requireTenant()
    const count = await prisma.member.count({
      where: {
        tenantId: tenant.id,
        status: { in: (opts.targetStatuses.length > 0 ? opts.targetStatuses : ['ACTIVE']) as MemberStatus[] },
        ...(opts.targetTierIds.length > 0 ? { tierId: { in: opts.targetTierIds } } : {}),
      },
    })
    return { success: true, data: count }
  } catch (e) {
    return { success: false, data: 0 }
  }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function getUnreadNotificationCount() {
  try {
    const tenant = await requireTenant()
    const count = await prisma.notification.count({
      where: { tenantId: tenant.id, memberId: null, isRead: false },
    })
    return { success: true, data: count }
  } catch (e) {
    return { success: false, data: 0 }
  }
}

export async function getAdminNotifications() {
  try {
    const tenant = await requireTenant()
    const notifications = await prisma.notification.findMany({
      where: { tenantId: tenant.id, memberId: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return { success: true, data: notifications }
  } catch (e) {
    console.error('[getAdminNotifications]', e)
    return { success: false, error: 'Failed to load notifications', data: [] }
  }
}

export async function markNotificationRead(id: string) {
  try {
    const tenant = await requireTenant()
    const notification = await prisma.notification.findFirst({ where: { id, tenantId: tenant.id } })
    if (!notification) return { success: false, error: 'Not found' }
    await prisma.notification.update({ where: { id, tenantId: tenant.id }, data: { isRead: true } })
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to mark read' }
  }
}

export async function markAllNotificationsRead() {
  try {
    const tenant = await requireTenant()
    await prisma.notification.updateMany({
      where: { tenantId: tenant.id, memberId: null, isRead: false },
      data: { isRead: true },
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to mark all read' }
  }
}

// ─── SMS ──────────────────────────────────────────────────────────────────────

const SmsBlastSchema = z.object({
  message:    z.string().min(1, 'Message required').max(1600),
  audience:   z.enum(['all', 'opted_in', 'tier']).default('opted_in'),
  tierId:     z.string().optional(),
})

export type SmsBlastInput = z.infer<typeof SmsBlastSchema>

export async function sendSmsBlast(input: SmsBlastInput) {
  try {
    const tenant = await requireTenant()
    const data = SmsBlastSchema.parse(input)

    const { sendSMS } = await import('@/lib/sms')

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: tenant.id,
      phone: { not: null },
    }
    if (data.audience === 'opted_in') {
      where.smsOptIn = true
    }
    if (data.audience === 'tier' && data.tierId) {
      where.tierId = data.tierId
      where.smsOptIn = true
    }

    const members = await prisma.member.findMany({
      where,
      select: { id: true, firstName: true, phone: true },
    })

    let sent = 0
    let failed = 0
    for (const member of members) {
      if (!member.phone) continue
      try {
        await sendSMS(member.phone, data.message)
        sent++
      } catch {
        failed++
      }
    }

    return { success: true, data: { sent, failed, total: members.length } }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[sendSmsBlast]', e)
    return { success: false, error: 'Failed to send SMS blast' }
  }
}

export async function getSmsOptInCount() {
  try {
    const tenant = await requireTenant()
    const count = await prisma.member.count({
      where: { tenantId: tenant.id, smsOptIn: true, phone: { not: null } },
    })
    return { success: true, data: count }
  } catch (e) {
    return { success: false, data: 0 }
  }
}
