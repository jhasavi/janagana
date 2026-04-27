'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getWebhookEndpoints() {
  try {
    const tenant = await requireTenant()
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { tenantId: tenant.id },
      include: { _count: { select: { deliveries: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: endpoints }
  } catch (e) {
    console.error('[getWebhookEndpoints]', e)
    return { success: false, error: 'Failed to load webhooks', data: [] }
  }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

const EndpointSchema = z.object({
  url:      z.string().url('Must be a valid URL'),
  events:   z.array(z.string()).min(1, 'Select at least one event'),
  isActive: z.boolean().default(true),
})

export async function createWebhookEndpoint(input: z.infer<typeof EndpointSchema>) {
  try {
    const tenant = await requireTenant()
    const data = EndpointSchema.parse(input)
    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`
    const endpoint = await prisma.webhookEndpoint.create({
      data: { tenantId: tenant.id, ...data, secret },
    })
    revalidatePath('/dashboard/settings/webhooks')
    return { success: true, data: endpoint }
  } catch (e) {
    console.error('[createWebhookEndpoint]', e)
    return { success: false, error: 'Failed to create endpoint' }
  }
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

export async function toggleWebhookEndpoint(id: string, isActive: boolean) {
  try {
    const tenant = await requireTenant()
    const existing = await prisma.webhookEndpoint.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Not found' }
    await prisma.webhookEndpoint.update({ where: { id, tenantId: tenant.id }, data: { isActive } })
    revalidatePath('/dashboard/settings/webhooks')
    return { success: true }
  } catch (e) {
    console.error('[toggleWebhookEndpoint]', e)
    return { success: false, error: 'Failed to update endpoint' }
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteWebhookEndpoint(id: string) {
  try {
    const tenant = await requireTenant()
    const existing = await prisma.webhookEndpoint.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Not found' }
    await prisma.webhookEndpoint.delete({ where: { id, tenantId: tenant.id } })
    revalidatePath('/dashboard/settings/webhooks')
    return { success: true }
  } catch (e) {
    console.error('[deleteWebhookEndpoint]', e)
    return { success: false, error: 'Failed to delete endpoint' }
  }
}
