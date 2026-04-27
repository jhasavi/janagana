'use server'

import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import type { AuditAction } from '@prisma/client'

// ─── LOG AUDIT ───────────────────────────────────────────────────────────────

interface LogAuditParams {
  tenantId: string
  action: AuditAction
  resourceType: string
  resourceId: string
  resourceName?: string
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget audit logger. Never throws — errors are swallowed so they
 * don't break the calling server action.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const { userId } = await auth()
    await prisma.auditLog.create({
      data: {
        tenantId:     params.tenantId,
        action:       params.action,
        resourceType: params.resourceType,
        resourceId:   params.resourceId,
        resourceName: params.resourceName,
        actorClerkId: userId ?? null,
        metadata:     params.metadata as Record<string, string | number | boolean | null> ?? undefined,
      },
    })
  } catch (error) {
    console.error('[logAudit]', error)
  }
}

// ─── GET AUDIT LOGS ──────────────────────────────────────────────────────────

const AuditFiltersSchema = z.object({
  resourceType: z.string().optional(),
  action:       z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
  limit:        z.number().int().min(1).max(500).default(100),
  offset:       z.number().int().min(0).default(0),
})

export async function getAuditLogs(params?: {
  resourceType?: string
  action?: string
  limit?: number
  offset?: number
}) {
  try {
    const tenant = await requireTenant()

    const filters = AuditFiltersSchema.parse({
      resourceType: params?.resourceType,
      action:       params?.action as 'CREATE' | 'UPDATE' | 'DELETE' | undefined,
      limit:        params?.limit  ?? 100,
      offset:       params?.offset ?? 0,
    })

    const where: Record<string, unknown> = { tenantId: tenant.id }
    if (filters.resourceType) where.resourceType = filters.resourceType
    if (filters.action)       where.action       = filters.action

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    filters.limit,
        skip:    filters.offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    return { success: true, data: logs, total }
  } catch (error) {
    console.error('[getAuditLogs]', error)
    return { success: false, error: 'Failed to load audit logs', data: [], total: 0 }
  }
}
