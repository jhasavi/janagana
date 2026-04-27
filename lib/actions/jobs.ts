'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const JobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  company: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  description: z.string().min(1, 'Description is required'),
  applyUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  applyEmail: z.string().email('Must be a valid email').optional().or(z.literal('')),
  salaryMin: z.number().int().min(0).optional().nullable(),
  salaryMax: z.number().int().min(0).optional().nullable(),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'VOLUNTEER', 'INTERNSHIP']).default('FULL_TIME'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'FILLED']).default('DRAFT'),
  isFeatured: z.boolean().default(false),
  expiresAt: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
})

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

export async function getJobPostings(params?: { status?: string; search?: string }) {
  try {
    const tenant = await requireTenant()
    const where: Record<string, unknown> = { tenantId: tenant.id }

    if (params?.status && params.status !== 'all') where.status = params.status
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { company: { contains: params.search, mode: 'insensitive' } },
        { location: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const jobs = await prisma.jobPosting.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    })
    return { success: true, data: jobs }
  } catch (error) {
    console.error('[getJobPostings]', error)
    return { success: false, error: 'Failed to load jobs', data: [] }
  }
}

export async function getPublicJobPostings(tenantId: string) {
  try {
    const now = new Date()
    const jobs = await prisma.jobPosting.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    })
    return { success: true, data: jobs }
  } catch (error) {
    console.error('[getPublicJobPostings]', error)
    return { success: false, error: 'Failed to load jobs', data: [] }
  }
}

export async function getJobPosting(id: string) {
  try {
    const tenant = await requireTenant()
    const job = await prisma.jobPosting.findFirst({ where: { id, tenantId: tenant.id } })
    if (!job) return { success: false, error: 'Job not found', data: null }
    return { success: true, data: job }
  } catch (error) {
    console.error('[getJobPosting]', error)
    return { success: false, error: 'Failed to load job', data: null }
  }
}

export async function createJobPosting(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = JobSchema.parse(input)

    const job = await prisma.jobPosting.create({
      data: {
        tenantId: tenant.id,
        title: data.title,
        company: data.company,
        location: data.location,
        isRemote: data.isRemote,
        description: data.description,
        applyUrl: data.applyUrl || null,
        applyEmail: data.applyEmail || null,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        jobType: data.jobType,
        status: data.status,
        isFeatured: data.isFeatured,
        tags: data.tags,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    })

    revalidatePath('/dashboard/jobs')
    return { success: true, data: job }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    console.error('[createJobPosting]', error)
    return { success: false, error: 'Failed to create job posting' }
  }
}

export async function updateJobPosting(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = JobSchema.parse(input)

    const existing = await prisma.jobPosting.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Job not found' }

    const job = await prisma.jobPosting.update({
      where: { id },
      data: {
        title: data.title,
        company: data.company,
        location: data.location,
        isRemote: data.isRemote,
        description: data.description,
        applyUrl: data.applyUrl || null,
        applyEmail: data.applyEmail || null,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        jobType: data.jobType,
        status: data.status,
        isFeatured: data.isFeatured,
        tags: data.tags,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    })

    revalidatePath('/dashboard/jobs')
    revalidatePath(`/dashboard/jobs/${id}`)
    return { success: true, data: job }
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    console.error('[updateJobPosting]', error)
    return { success: false, error: 'Failed to update job posting' }
  }
}

export async function deleteJobPosting(id: string) {
  try {
    const tenant = await requireTenant()
    const existing = await prisma.jobPosting.findFirst({ where: { id, tenantId: tenant.id } })
    if (!existing) return { success: false, error: 'Job not found' }

    await prisma.jobPosting.delete({ where: { id } })
    revalidatePath('/dashboard/jobs')
    return { success: true }
  } catch (error) {
    console.error('[deleteJobPosting]', error)
    return { success: false, error: 'Failed to delete job posting' }
  }
}
