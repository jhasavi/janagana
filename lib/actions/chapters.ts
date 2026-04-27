'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getChapters() {
  try {
    const tenant = await requireTenant()
    const chapters = await prisma.chapter.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: { select: { members: true, memberships: true } },
      },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: chapters }
  } catch (e) {
    console.error('[getChapters]', e)
    return { success: false, error: 'Failed to load chapters', data: [] }
  }
}

export async function getChapter(id: string) {
  try {
    const tenant = await requireTenant()
    const chapter = await prisma.chapter.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        memberships: {
          include: { member: true },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true, memberships: true } },
      },
    })
    if (!chapter) return { success: false, error: 'Not found', data: null }
    return { success: true, data: chapter }
  } catch (e) {
    console.error('[getChapter]', e)
    return { success: false, error: 'Failed to load chapter', data: null }
  }
}

// ─── CREATE / UPDATE ──────────────────────────────────────────────────────────

const ChapterSchema = z.object({
  name:        z.string().min(1, 'Name required').max(100),
  slug:        z.string().min(1, 'Slug required').max(80).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, hyphens'),
  description: z.string().optional(),
  city:        z.string().optional(),
  state:       z.string().optional(),
  country:     z.string().default('US'),
  isActive:    z.boolean().default(true),
})

export async function createChapter(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = ChapterSchema.parse(input)
    const chapter = await prisma.chapter.create({
      data: { ...data, tenantId: tenant.id },
    })
    revalidatePath('/dashboard/chapters')
    return { success: true, data: chapter }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[createChapter]', e)
    return { success: false, error: 'Failed to create chapter' }
  }
}

export async function updateChapter(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = ChapterSchema.parse(input)
    const chapter = await prisma.chapter.update({
      where: { id, tenantId: tenant.id },
      data,
    })
    revalidatePath('/dashboard/chapters')
    revalidatePath(`/dashboard/chapters/${id}`)
    return { success: true, data: chapter }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[updateChapter]', e)
    return { success: false, error: 'Failed to update chapter' }
  }
}

export async function deleteChapter(id: string) {
  try {
    const tenant = await requireTenant()
    await prisma.chapter.delete({ where: { id, tenantId: tenant.id } })
    revalidatePath('/dashboard/chapters')
    return { success: true }
  } catch (e) {
    console.error('[deleteChapter]', e)
    return { success: false, error: 'Failed to delete chapter' }
  }
}

export async function toggleChapterActive(id: string) {
  try {
    const tenant = await requireTenant()
    const chapter = await prisma.chapter.findFirst({ where: { id, tenantId: tenant.id } })
    if (!chapter) return { success: false, error: 'Not found' }

    const updated = await prisma.chapter.update({
      where: { id },
      data: { isActive: !chapter.isActive },
    })
    revalidatePath('/dashboard/chapters')
    return { success: true, data: updated }
  } catch (e) {
    console.error('[toggleChapterActive]', e)
    return { success: false, error: 'Failed to update chapter' }
  }
}

// ─── CHAPTER MEMBERS ─────────────────────────────────────────────────────────

/**
 * Add a member to a chapter by email address.
 * Looks up the member record in the tenant by email before creating the join.
 */
export async function addChapterMember(
  chapterId: string,
  emailOrMemberId: string,
  role: 'MEMBER' | 'LEADER' | 'ADMIN' = 'MEMBER',
) {
  try {
    const tenant = await requireTenant()

    // Resolve to a real member ID: try by email first, then treat as literal ID
    let memberId = emailOrMemberId
    if (emailOrMemberId.includes('@')) {
      const member = await prisma.member.findFirst({
        where: { tenantId: tenant.id, email: { equals: emailOrMemberId, mode: 'insensitive' } },
        select: { id: true },
      })
      if (!member) return { success: false, error: `No member found with email "${emailOrMemberId}"` }
      memberId = member.id
    }

    // Idempotent: skip if already a member of this chapter
    const existing = await prisma.chapterMember.findFirst({ where: { chapterId, memberId } })
    if (existing) return { success: false, error: 'Member is already in this chapter' }

    await prisma.chapterMember.create({
      data: { chapterId, memberId, tenantId: tenant.id, role },
    })
    revalidatePath(`/dashboard/chapters/${chapterId}`)
    return { success: true }
  } catch (e) {
    console.error('[addChapterMember]', e)
    return { success: false, error: 'Failed to add member' }
  }
}

export async function removeChapterMember(chapterMemberId: string) {
  try {
    const tenant = await requireTenant()
    await prisma.chapterMember.deleteMany({
      where: { id: chapterMemberId, tenantId: tenant.id },
    })
    return { success: true }
  } catch (e) {
    console.error('[removeChapterMember]', e)
    return { success: false, error: 'Failed to remove member' }
  }
}

export async function updateChapterMemberRole(
  chapterMemberId: string,
  role: 'MEMBER' | 'LEADER' | 'ADMIN',
) {
  try {
    const tenant = await requireTenant()
    await prisma.chapterMember.updateMany({
      where: { id: chapterMemberId, tenantId: tenant.id },
      data: { role },
    })
    return { success: true }
  } catch (e) {
    console.error('[updateChapterMemberRole]', e)
    return { success: false, error: 'Failed to update role' }
  }
}
