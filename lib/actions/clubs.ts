'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { ensureContactForMember } from '@/lib/contact-linking'

const ClubSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getClubs() {
  try {
    const tenant = await requireTenant()
    const clubs = await prisma.club.findMany({
      where: { tenantId: tenant.id },
      include: { _count: { select: { memberships: true, posts: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: clubs }
  } catch (e) {
    console.error('[getClubs]', e)
    return { success: false, error: 'Failed to load clubs', data: [] }
  }
}

// ─── DETAIL ───────────────────────────────────────────────────────────────────

export async function getClub(id: string) {
  try {
    const tenant = await requireTenant()
    const club = await prisma.club.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        memberships: {
          include: { member: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        posts: {
          include: { member: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { memberships: true, posts: true } },
      },
    })
    if (!club) return { success: false, error: 'Club not found', data: null }
    return { success: true, data: club }
  } catch (e) {
    console.error('[getClub]', e)
    return { success: false, error: 'Failed to load club', data: null }
  }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createClub(input: z.infer<typeof ClubSchema>) {
  try {
    const tenant = await requireTenant()
    const data = ClubSchema.parse(input)
    const club = await prisma.club.create({ data: { ...data, tenantId: tenant.id } })
    revalidatePath('/dashboard/clubs')
    return { success: true, data: club }
  } catch (e) {
    console.error('[createClub]', e)
    return { success: false, error: 'Failed to create club' }
  }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateClub(id: string, input: Partial<z.infer<typeof ClubSchema>>) {
  try {
    const tenant = await requireTenant()
    const club = await prisma.club.findFirst({ where: { id, tenantId: tenant.id } })
    if (!club) return { success: false, error: 'Club not found' }
    const updated = await prisma.club.update({ where: { id, tenantId: tenant.id }, data: input })
    revalidatePath('/dashboard/clubs')
    revalidatePath(`/dashboard/clubs/${id}`)
    return { success: true, data: updated }
  } catch (e) {
    console.error('[updateClub]', e)
    return { success: false, error: 'Failed to update club' }
  }
}

// ─── ADD MEMBER ───────────────────────────────────────────────────────────────

export async function addClubMember(clubId: string, memberId: string, role: 'MEMBER' | 'ADMIN' | 'OWNER' = 'MEMBER') {
  try {
    const tenant = await requireTenant()
    const club = await prisma.club.findFirst({ where: { id: clubId, tenantId: tenant.id } })
    if (!club) return { success: false, error: 'Club not found' }

    // Contact-first dual-write
    const member = await prisma.member.findFirst({ where: { id: memberId, tenantId: tenant.id } })
    let contactId: string | undefined
    if (member) {
      const contact = await ensureContactForMember(member)
      contactId = contact.id
    }

    const membership = await prisma.clubMembership.upsert({
      where: { clubId_memberId: { clubId, memberId } },
      update: { role, ...(contactId ? { contactId } : {}) },
      create: { clubId, memberId, role, ...(contactId ? { contactId } : {}) },
    })
    revalidatePath(`/dashboard/clubs/${clubId}`)
    return { success: true, data: membership }
  } catch (e) {
    console.error('[addClubMember]', e)
    return { success: false, error: 'Failed to add member' }
  }
}

// ─── REMOVE MEMBER ────────────────────────────────────────────────────────────

export async function removeClubMember(clubId: string, memberId: string) {
  try {
    const tenant = await requireTenant()
    const club = await prisma.club.findFirst({ where: { id: clubId, tenantId: tenant.id } })
    if (!club) return { success: false, error: 'Club not found' }
    await prisma.clubMembership.deleteMany({ where: { clubId, memberId } })
    revalidatePath(`/dashboard/clubs/${clubId}`)
    return { success: true }
  } catch (e) {
    console.error('[removeClubMember]', e)
    return { success: false, error: 'Failed to remove member' }
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function createClubPost(clubId: string, memberId: string, content: string) {
  try {
    const tenant = await requireTenant()
    const club = await prisma.club.findFirst({ where: { id: clubId, tenantId: tenant.id } })
    if (!club) return { success: false, error: 'Club not found' }

    // Contact-first dual-write
    const member = await prisma.member.findFirst({ where: { id: memberId, tenantId: tenant.id } })
    let contactId: string | undefined
    if (member) {
      const contact = await ensureContactForMember(member)
      contactId = contact.id
    }

    const post = await prisma.clubPost.create({
      data: { clubId, memberId, content, ...(contactId ? { contactId } : {}) },
    })
    revalidatePath(`/dashboard/clubs/${clubId}`)
    return { success: true, data: post }
  } catch (e) {
    console.error('[createClubPost]', e)
    return { success: false, error: 'Failed to create post' }
  }
}

export async function deleteClubPost(postId: string) {
  try {
    const tenant = await requireTenant()
    const post = await prisma.clubPost.findFirst({
      where: { id: postId },
      include: { club: true },
    })
    if (!post || post.club.tenantId !== tenant.id) return { success: false, error: 'Not found' }
    await prisma.clubPost.delete({ where: { id: postId } })
    revalidatePath(`/dashboard/clubs/${post.clubId}`)
    return { success: true }
  } catch (e) {
    console.error('[deleteClubPost]', e)
    return { success: false, error: 'Failed to delete post' }
  }
}
