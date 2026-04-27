'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const PageSchema = z.object({
  title:       z.string().min(1, 'Title required').max(200),
  slug:        z.string().optional(),
  content:     z.string().default(''),
  excerpt:     z.string().optional(),
  isPublished: z.boolean().default(false),
  showInNav:   z.boolean().default(false),
  sortOrder:   z.number().int().default(0),
})

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getContentPages() {
  try {
    const tenant = await requireTenant()
    const pages = await prisma.contentPage.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true,
        showInNav: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        excerpt: true,
      },
    })
    return { success: true, data: pages }
  } catch (e) {
    console.error('[getContentPages]', e)
    return { success: false, error: 'Failed to load pages', data: [] }
  }
}

export async function getContentPage(id: string) {
  try {
    const tenant = await requireTenant()
    const page = await prisma.contentPage.findFirst({
      where: { id, tenantId: tenant.id },
    })
    if (!page) return { success: false, error: 'Not found', data: null }
    return { success: true, data: page }
  } catch (e) {
    console.error('[getContentPage]', e)
    return { success: false, error: 'Failed to load page', data: null }
  }
}

// Public: by slug, no auth required
export async function getPublicContentPage(tenantSlug: string, pageSlug: string) {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) return { success: false, error: 'Not found', data: null }

    const page = await prisma.contentPage.findFirst({
      where: { tenantId: tenant.id, slug: pageSlug, isPublished: true },
    })
    if (!page) return { success: false, error: 'Not found', data: null }
    return { success: true, data: page }
  } catch (e) {
    console.error('[getPublicContentPage]', e)
    return { success: false, error: 'Failed to load page', data: null }
  }
}

export async function getPublicNavPages(tenantSlug: string) {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) return { success: false, data: [] }

    const pages = await prisma.contentPage.findMany({
      where: { tenantId: tenant.id, isPublished: true, showInNav: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, slug: true },
    })
    return { success: true, data: pages }
  } catch (e) {
    return { success: false, data: [] }
  }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createContentPage(input: unknown) {
  try {
    const tenant = await requireTenant()
    const raw = PageSchema.parse(input)
    const finalSlug = raw.slug?.trim() || slugify(raw.title)

    const existing = await prisma.contentPage.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: finalSlug } },
    })
    if (existing) return { success: false, error: 'A page with this slug already exists' }

    const page = await prisma.contentPage.create({
      data: { ...raw, slug: finalSlug, tenantId: tenant.id },
    })
    revalidatePath('/dashboard/pages')
    return { success: true, data: page }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[createContentPage]', e)
    return { success: false, error: 'Failed to create page' }
  }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateContentPage(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const raw = PageSchema.parse(input)

    const existing = await prisma.contentPage.findFirst({
      where: { id, tenantId: tenant.id },
    })
    if (!existing) return { success: false, error: 'Not found' }

    const finalSlug = raw.slug?.trim() || slugify(raw.title)
    // Check slug uniqueness (excluding self)
    const conflict = await prisma.contentPage.findFirst({
      where: { tenantId: tenant.id, slug: finalSlug, NOT: { id } },
    })
    if (conflict) return { success: false, error: 'A page with this slug already exists' }

    const page = await prisma.contentPage.update({
      where: { id, tenantId: tenant.id },
      data: { ...raw, slug: finalSlug },
    })
    revalidatePath('/dashboard/pages')
    revalidatePath(`/dashboard/pages/${id}`)
    return { success: true, data: page }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[updateContentPage]', e)
    return { success: false, error: 'Failed to update page' }
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteContentPage(id: string) {
  try {
    const tenant = await requireTenant()
    const existing = await prisma.contentPage.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Not found' }

    await prisma.contentPage.delete({ where: { id } })
    revalidatePath('/dashboard/pages')
    return { success: true }
  } catch (e) {
    console.error('[deleteContentPage]', e)
    return { success: false, error: 'Failed to delete page' }
  }
}
