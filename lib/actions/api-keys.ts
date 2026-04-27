'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getApiKeys() {
  try {
    const tenant = await requireTenant()
    const keys = await prisma.apiKey.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: keys }
  } catch (e) {
    console.error('[getApiKeys]', e)
    return { success: false, error: 'Failed to load API keys', data: [] }
  }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  name:        z.string().min(1, 'Name required').max(100),
  permissions: z.array(z.string()).default([]),
  expiresAt:   z.string().optional().nullable(),
})

export async function createApiKey(input: z.infer<typeof CreateSchema>) {
  try {
    const tenant = await requireTenant()
    const data = CreateSchema.parse(input)

    // Generate a cryptographically secure random key
    const rawKey = `jg_live_${crypto.randomBytes(24).toString('base64url')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.slice(0, 12)

    const key = await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        keyHash,
        keyPrefix,
        permissions: data.permissions,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    })

    revalidatePath('/dashboard/settings/api-keys')
    // Return raw key ONCE — never stored in plain text
    return { success: true, data: key, rawKey }
  } catch (e) {
    console.error('[createApiKey]', e)
    return { success: false, error: 'Failed to create API key' }
  }
}

// ─── REVOKE ───────────────────────────────────────────────────────────────────

export async function revokeApiKey(id: string) {
  try {
    const tenant = await requireTenant()
    const key = await prisma.apiKey.findFirst({ where: { id, tenantId: tenant.id } })
    if (!key) return { success: false, error: 'Not found' }
    await prisma.apiKey.update({ where: { id, tenantId: tenant.id }, data: { isActive: false } })
    revalidatePath('/dashboard/settings/api-keys')
    return { success: true }
  } catch (e) {
    console.error('[revokeApiKey]', e)
    return { success: false, error: 'Failed to revoke key' }
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteApiKey(id: string) {
  try {
    const tenant = await requireTenant()
    const key = await prisma.apiKey.findFirst({ where: { id, tenantId: tenant.id } })
    if (!key) return { success: false, error: 'Not found' }
    await prisma.apiKey.delete({ where: { id, tenantId: tenant.id } })
    revalidatePath('/dashboard/settings/api-keys')
    return { success: true }
  } catch (e) {
    console.error('[deleteApiKey]', e)
    return { success: false, error: 'Failed to delete key' }
  }
}
