'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireTenantActionAccess } from '@/lib/actions/permissions'

const SavedContactFilterSchema = z.object({
  name: z.string().trim().min(1, 'A name is required'),
  filters: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    role: z.string().optional(),
    tag: z.string().optional(),
  }),
})

type ActionResult<T = undefined> = Promise<
  | { success: true; data: T }
  | { success: false; error: string }
>

async function requireCRMAccess(actionName: string) {
  const access = await requireTenantActionAccess(actionName, 'crm_manage')
  if (!access.success) {
    return { ok: false as const, error: access.error }
  }
  return { ok: true as const, tenant: access.tenant }
}

type SavedContactFilterReturn = {
  id: string
  name: string
  filters: Record<string, string | undefined>
  createdAt: Date
}

function normalizeFilters(raw: unknown): Record<string, string | undefined> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, typeof value === 'string' ? value : undefined])
    )
  }
  return {}
}

export async function getSavedContactFilters(): ActionResult<SavedContactFilterReturn[]> {
  const access = await requireCRMAccess('getSavedContactFilters')
  if (!access.ok) return { success: false, error: access.error }

  const filters = await prisma.savedContactFilter.findMany({
    where: { tenantId: access.tenant.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      filters: true,
      createdAt: true,
    },
  })

  const normalized = filters.map((item) => ({
    ...item,
    filters: normalizeFilters(item.filters),
  }))

  return { success: true, data: normalized }
}

export async function saveContactFilter(input: unknown): ActionResult<SavedContactFilterReturn> {
  try {
    const values = SavedContactFilterSchema.parse(input)
    const access = await requireCRMAccess('saveContactFilter')
    if (!access.ok) return { success: false, error: access.error }

    const filter = await prisma.savedContactFilter.create({
      data: {
        tenantId: access.tenant.id,
        name: values.name,
        filters: values.filters,
      },
      select: {
        id: true,
        name: true,
        filters: true,
        createdAt: true,
      },
    })

    revalidatePath('/dashboard/crm')
    return { success: true, data: { ...filter, filters: normalizeFilters(filter.filters) } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid input' }
    }
    console.error('[saveContactFilter]', error)
    return { success: false, error: 'Failed to save filter' }
  }
}

export async function deleteContactFilter(id: string): ActionResult<undefined> {
  try {
    const access = await requireCRMAccess('deleteContactFilter')
    if (!access.ok) return { success: false, error: access.error }

    const existing = await prisma.savedContactFilter.findFirst({
      where: { id, tenantId: access.tenant.id },
      select: { id: true },
    })

    if (!existing) {
      return { success: false, error: 'Saved filter not found' }
    }

    await prisma.savedContactFilter.delete({ where: { id } })
    revalidatePath('/dashboard/crm')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteContactFilter]', error)
    return { success: false, error: 'Failed to delete saved filter' }
  }
}
