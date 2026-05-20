'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed']

export async function updateSupportStatus(id: string, status: string) {
  try {
    if (!VALID_STATUSES.includes(status)) {
      return { success: false, error: 'Invalid status' }
    }

    const tenant = await getTenant()
    if (!tenant) return { success: false, error: 'No organization' }

    await prisma.supportRequest.update({
      where: { id, tenantId: tenant.id },
      data: { status },
    })

    revalidatePath('/dashboard/support')
    return { success: true }
  } catch (error) {
    console.error('[updateSupportStatus]', error)
    return { success: false, error: 'Failed to update status' }
  }
}
