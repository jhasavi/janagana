'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { uploadFile, deleteFile } from '@/lib/upload'

// ─── ALBUMS ───────────────────────────────────────────────────────────────────

export async function getPhotoAlbums() {
  try {
    const tenant = await requireTenant()
    const albums = await prisma.photoAlbum.findMany({
      where: { tenantId: tenant.id },
      include: { _count: { select: { photos: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return { success: true, data: albums }
  } catch (e) {
    console.error('[getPhotoAlbums]', e)
    return { success: false, error: 'Failed to load albums', data: [] }
  }
}

export async function getPhotoAlbum(id: string) {
  try {
    const tenant = await requireTenant()
    const album = await prisma.photoAlbum.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        photos: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    })
    if (!album) return { success: false, error: 'Not found', data: null }
    return { success: true, data: album }
  } catch (e) {
    console.error('[getPhotoAlbum]', e)
    return { success: false, error: 'Failed to load album', data: null }
  }
}

export async function getPublicPhotoAlbums(tenantSlug: string) {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) return { success: false, data: [] }

    const albums = await prisma.photoAlbum.findMany({
      where: { tenantId: tenant.id, isPublished: true },
      include: { _count: { select: { photos: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return { success: true, data: albums }
  } catch (e) {
    return { success: false, data: [] }
  }
}

export async function getPublicPhotoAlbum(tenantSlug: string, albumId: string) {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) return { success: false, error: 'Not found', data: null }

    const album = await prisma.photoAlbum.findFirst({
      where: { id: albumId, tenantId: tenant.id, isPublished: true },
      include: {
        photos: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    })
    if (!album) return { success: false, error: 'Not found', data: null }
    return { success: true, data: album }
  } catch (e) {
    console.error('[getPublicPhotoAlbum]', e)
    return { success: false, error: 'Failed to load album', data: null }
  }
}

const AlbumSchema = z.object({
  title:       z.string().min(1, 'Title required').max(200),
  description: z.string().optional(),
  isPublished: z.boolean().default(false),
  sortOrder:   z.number().int().default(0),
})

export async function createPhotoAlbum(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = AlbumSchema.parse(input)
    const album = await prisma.photoAlbum.create({
      data: { ...data, tenantId: tenant.id },
    })
    revalidatePath('/dashboard/gallery')
    return { success: true, data: album }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[createPhotoAlbum]', e)
    return { success: false, error: 'Failed to create album' }
  }
}

export async function updatePhotoAlbum(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = AlbumSchema.parse(input)
    const album = await prisma.photoAlbum.update({
      where: { id, tenantId: tenant.id },
      data,
    })
    revalidatePath('/dashboard/gallery')
    revalidatePath(`/dashboard/gallery/${id}`)
    return { success: true, data: album }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[updatePhotoAlbum]', e)
    return { success: false, error: 'Failed to update album' }
  }
}

export async function deletePhotoAlbum(id: string) {
  try {
    const tenant = await requireTenant()
    // Delete all photos from Cloudinary first
    const photos = await prisma.photo.findMany({
      where: { albumId: id, tenantId: tenant.id },
      select: { publicId: true },
    })
    for (const p of photos) {
      try { await deleteFile(p.publicId) } catch { /* continue */ }
    }
    await prisma.photoAlbum.delete({ where: { id, tenantId: tenant.id } })
    revalidatePath('/dashboard/gallery')
    return { success: true }
  } catch (e) {
    console.error('[deletePhotoAlbum]', e)
    return { success: false, error: 'Failed to delete album' }
  }
}

// ─── PHOTOS ───────────────────────────────────────────────────────────────────

export async function uploadPhoto(formData: FormData) {
  try {
    const tenant = await requireTenant()

    const albumId = formData.get('albumId') as string | null
    const caption = formData.get('caption') as string | null
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) return { success: false, error: 'No file provided' }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed.' }
    }
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Image is too large. Maximum size is 10 MB.' }
    }

    // Verify album belongs to tenant if provided
    if (albumId) {
      const album = await prisma.photoAlbum.findFirst({ where: { id: albumId, tenantId: tenant.id } })
      if (!album) return { success: false, error: 'Album not found' }
    }

    const folder = `janagana/${tenant.slug}/gallery`
    const uploaded = await uploadFile(file, folder)

    const photo = await prisma.photo.create({
      data: {
        tenantId: tenant.id,
        albumId:  albumId || null,
        title:    file.name.replace(/\.[^/.]+$/, ''),
        caption:  caption || null,
        fileUrl:  uploaded.secure_url,
        publicId: uploaded.public_id,
      },
    })

    revalidatePath('/dashboard/gallery')
    if (albumId) revalidatePath(`/dashboard/gallery/${albumId}`)
    return { success: true, data: photo }
  } catch (e) {
    console.error('[uploadPhoto]', e)
    return { success: false, error: 'Failed to upload photo' }
  }
}

export async function deletePhoto(photoId: string) {
  try {
    const tenant = await requireTenant()
    const photo = await prisma.photo.findFirst({ where: { id: photoId, tenantId: tenant.id } })
    if (!photo) return { success: false, error: 'Photo not found' }

    try { await deleteFile(photo.publicId) } catch { /* continue */ }

    await prisma.photo.delete({ where: { id: photoId } })
    revalidatePath('/dashboard/gallery')
    if (photo.albumId) revalidatePath(`/dashboard/gallery/${photo.albumId}`)
    return { success: true }
  } catch (e) {
    console.error('[deletePhoto]', e)
    return { success: false, error: 'Failed to delete photo' }
  }
}
