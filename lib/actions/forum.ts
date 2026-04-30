'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

const ThreadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Content is required'),
  category: z.enum(['GENERAL', 'ANNOUNCEMENTS', 'QUESTIONS', 'INTRODUCTIONS', 'FEEDBACK', 'PROJECTS', 'OTHER']).default('GENERAL'),
  isPinned: z.boolean().default(false),
  isLocked: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
})

const ReplySchema = z.object({
  body: z.string().min(1, 'Reply cannot be empty'),
  isAdminReply: z.boolean().default(false),
})

// ─── THREADS ─────────────────────────────────────────────────────────────────

export async function getForumThreads(params?: { category?: string; search?: string }) {
  try {
    const tenant = await requireTenant()
    const where: Record<string, unknown> = { tenantId: tenant.id }

    if (params?.category && params.category !== 'all') where.category = params.category
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { body: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const threads = await prisma.forumThread.findMany({
      where,
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: [{ isPinned: 'desc' }, { lastReplyAt: 'desc' }, { createdAt: 'desc' }],
    })
    return { success: true, data: threads }
  } catch (error) {
    console.error('[getForumThreads]', error)
    return { success: false, error: 'Failed to load threads', data: [] }
  }
}

export async function getForumThread(id: string) {
  try {
    const tenant = await requireTenant()
    const thread = await prisma.forumThread.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        author: { select: { firstName: true, lastName: true } },
        replies: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!thread) return { success: false, error: 'Thread not found', data: null }
    return { success: true, data: thread }
  } catch (error) {
    console.error('[getForumThread]', error)
    return { success: false, error: 'Failed to load thread', data: null }
  }
}

export async function createForumThread(input: unknown) {
  try {
    const tenant = await requireTenant()
    const { userId: clerkUserId } = await auth()
    const data = ThreadSchema.parse(input)

    // Contact-first: find the Contact for the current Clerk user
    const authorContact = clerkUserId
      ? await prisma.contact.findFirst({ where: { tenantId: tenant.id, clerkUserId } })
      : null

    const thread = await prisma.forumThread.create({
      data: {
        tenantId: tenant.id,
        title: data.title,
        body: data.body,
        category: data.category,
        isPinned: data.isPinned,
        isLocked: data.isLocked,
        tags: data.tags,
        ...(authorContact ? { authorContactId: authorContact.id } : {}),
      },
    })

    revalidatePath('/dashboard/forum')
    return { success: true, data: thread }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    console.error('[createForumThread]', error)
    return { success: false, error: 'Failed to create thread' }
  }
}

export async function updateForumThread(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = ThreadSchema.parse(input)

    const existing = await prisma.forumThread.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Thread not found' }

    const thread = await prisma.forumThread.update({
      where: { id },
      data: {
        title: data.title,
        body: data.body,
        category: data.category,
        isPinned: data.isPinned,
        isLocked: data.isLocked,
        tags: data.tags,
      },
    })

    revalidatePath('/dashboard/forum')
    revalidatePath(`/dashboard/forum/${id}`)
    return { success: true, data: thread }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    console.error('[updateForumThread]', error)
    return { success: false, error: 'Failed to update thread' }
  }
}

export async function deleteForumThread(id: string) {
  try {
    const tenant = await requireTenant()
    const existing = await prisma.forumThread.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Thread not found' }

    await prisma.forumThread.delete({ where: { id } })
    revalidatePath('/dashboard/forum')
    return { success: true }
  } catch (error) {
    console.error('[deleteForumThread]', error)
    return { success: false, error: 'Failed to delete thread' }
  }
}

export async function pinForumThread(id: string, isPinned: boolean) {
  try {
    const tenant = await requireTenant()
    await prisma.forumThread.updateMany({ where: { id, tenantId: tenant.id }, data: { isPinned } })
    revalidatePath('/dashboard/forum')
    return { success: true }
  } catch (error) {
    console.error('[pinForumThread]', error)
    return { success: false, error: 'Failed to update thread' }
  }
}

export async function lockForumThread(id: string, isLocked: boolean) {
  try {
    const tenant = await requireTenant()
    await prisma.forumThread.updateMany({ where: { id, tenantId: tenant.id }, data: { isLocked } })
    revalidatePath('/dashboard/forum')
    revalidatePath(`/dashboard/forum/${id}`)
    return { success: true }
  } catch (error) {
    console.error('[lockForumThread]', error)
    return { success: false, error: 'Failed to update thread' }
  }
}

// ─── REPLIES ─────────────────────────────────────────────────────────────────

export async function addForumReply(threadId: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const { userId: clerkUserId } = await auth()
    const data = ReplySchema.parse(input)

    const thread = await prisma.forumThread.findFirst({ where: { id: threadId, tenantId: tenant.id } })
    if (!thread) return { success: false, error: 'Thread not found' }
    if (thread.isLocked) return { success: false, error: 'Thread is locked' }

    const authorContact = clerkUserId
      ? await prisma.contact.findFirst({ where: { tenantId: tenant.id, clerkUserId } })
      : null

    const reply = await prisma.forumReply.create({
      data: {
        threadId,
        body: data.body,
        isAdminReply: data.isAdminReply,
        ...(authorContact ? { authorContactId: authorContact.id } : {}),
      },
    })

    // Update thread counts
    await prisma.forumThread.update({
      where: { id: threadId },
      data: { replyCount: { increment: 1 }, lastReplyAt: new Date() },
    })

    revalidatePath(`/dashboard/forum/${threadId}`)
    return { success: true, data: reply }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    console.error('[addForumReply]', error)
    return { success: false, error: 'Failed to add reply' }
  }
}

export async function deleteForumReply(replyId: string) {
  try {
    const tenant = await requireTenant()
    const reply = await prisma.forumReply.findFirst({
      where: { id: replyId, thread: { tenantId: tenant.id } },
    })
    if (!reply) return { success: false, error: 'Reply not found' }

    await prisma.forumReply.delete({ where: { id: replyId } })
    await prisma.forumThread.update({
      where: { id: reply.threadId },
      data: { replyCount: { decrement: 1 } },
    })

    revalidatePath(`/dashboard/forum/${reply.threadId}`)
    return { success: true }
  } catch (error) {
    console.error('[deleteForumReply]', error)
    return { success: false, error: 'Failed to delete reply' }
  }
}
