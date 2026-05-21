'use server'

import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { sendSupportResponseEmail } from '@/lib/email'

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
const VALID_AUTHOR_TYPES = ['ADMIN', 'MEMBER', 'SYSTEM'] as const

type SupportStatus = (typeof VALID_STATUSES)[number]

type SupportRequestCommentInput = {
  body: string
  isPublic?: boolean
}

export async function getMemberSupportRequests(email: string, tenantId: string) {
  try {
    const requests = await prisma.supportRequest.findMany({
      where: {
        tenantId,
        email: { equals: email, mode: 'insensitive' },
      },
      include: {
        comments: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return { success: true, data: requests }
  } catch (error) {
    console.error('[getMemberSupportRequests]', error)
    return { success: false, error: 'Failed to load support requests', data: [] }
  }
}

export async function getSupportRequestDetail(id: string) {
  try {
    const tenant = await getTenant()
    if (!tenant) return { success: false, error: 'No organization', data: null }

    const request = await prisma.supportRequest.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!request) return { success: false, error: 'Support request not found', data: null }

    return { success: true, data: request }
  } catch (error) {
    console.error('[getSupportRequestDetail]', error)
    return { success: false, error: 'Failed to load support request', data: null }
  }
}

export async function addSupportRequestComment(id: string, input: unknown) {
  try {
    const data = z.object({ body: z.string().trim().min(1), isPublic: z.boolean().optional().default(false) }).parse(input)
    const tenant = await getTenant()
    if (!tenant) return { success: false, error: 'No organization' }

    const request = await prisma.supportRequest.findFirst({ where: { id, tenantId: tenant.id } })
    if (!request) return { success: false, error: 'Support request not found' }

    const user = await currentUser()
    const authorName = user?.firstName || user?.lastName || user?.primaryEmailAddress?.emailAddress || undefined

    await prisma.supportRequestComment.create({
      data: {
        tenantId: tenant.id,
        supportRequestId: id,
        authorType: 'ADMIN',
        authorName: authorName ?? undefined,
        body: data.body,
        isPublic: data.isPublic,
      },
    })

    if (data.isPublic && request.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
      const portalUrl = appUrl && request.context?.startsWith('portal:')
        ? `${appUrl}/portal/${request.context.split(':')[1]}/support`
        : undefined

      await sendSupportResponseEmail({
        to: request.email,
        requesterName: request.name,
        orgName: tenant.name,
        response: data.body,
        portalUrl,
      }).catch((emailError) => console.error('[addSupportRequestComment] email error', emailError))
    }

    revalidatePath(`/dashboard/support/${id}`)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Invalid comment' }
    }
    console.error('[addSupportRequestComment]', error)
    return { success: false, error: 'Failed to add comment' }
  }
}

export async function updateSupportStatus(id: string, status: string) {
  try {
    if (!VALID_STATUSES.includes(status as SupportStatus)) {
      return { success: false, error: 'Invalid status' }
    }

    const tenant = await getTenant()
    if (!tenant) return { success: false, error: 'No organization' }

    await prisma.supportRequest.update({
      where: { id, tenantId: tenant.id },
      data: { status },
    })

    revalidatePath('/dashboard/support')
    revalidatePath(`/dashboard/support/${id}`)
    return { success: true }
  } catch (error) {
    console.error('[updateSupportStatus]', error)
    return { success: false, error: 'Failed to update status' }
  }
}
