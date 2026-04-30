'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import type { JobApplicationStatus } from '@prisma/client'

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getJobApplications(opts?: {
  jobPostingId?: string
  status?: JobApplicationStatus
}) {
  try {
    const tenant = await requireTenant()
    const applications = await prisma.jobApplication.findMany({
      where: {
        tenantId: tenant.id,
        ...(opts?.jobPostingId ? { jobPostingId: opts.jobPostingId } : {}),
        ...(opts?.status ? { status: opts.status } : {}),
      },
      include: {
        jobPosting: { select: { id: true, title: true, jobType: true } },
        contact:    { select: { id: true, firstName: true, lastName: true, emails: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
    })
    return { success: true, data: applications }
  } catch (e) {
    console.error('[getJobApplications]', e)
    return { success: false, error: 'Failed to load applications', data: [] }
  }
}

export async function getJobApplication(id: string) {
  try {
    const tenant = await requireTenant()
    const application = await prisma.jobApplication.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        jobPosting: true,
        contact:    { select: { id: true, firstName: true, lastName: true, emails: true, email: true, phone: true, phones: true } },
      },
    })
    if (!application) return { success: false, error: 'Application not found', data: null }
    return { success: true, data: application }
  } catch (e) {
    console.error('[getJobApplication]', e)
    return { success: false, error: 'Failed to load application', data: null }
  }
}

// ─── STATUS UPDATE ────────────────────────────────────────────────────────────

const StatusUpdateSchema = z.object({
  status:          z.enum(['SUBMITTED', 'UNDER_REVIEW', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN']),
  notes:           z.string().optional(),
  rejectionReason: z.string().optional(),
})

export async function updateApplicationStatus(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const { status, notes, rejectionReason } = StatusUpdateSchema.parse(input)

    const extra: Record<string, unknown> = {}
    if (status === 'HIRED') extra.hiredAt = new Date()
    if (['UNDER_REVIEW', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'].includes(status)) {
      extra.reviewedAt = new Date()
    }

    const application = await prisma.jobApplication.update({
      where: { id, tenantId: tenant.id },
      data: { status, notes, rejectionReason, ...extra },
    })
    revalidatePath('/dashboard/jobs/applications')
    revalidatePath(`/dashboard/jobs/applications/${id}`)
    return { success: true, data: application }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[updateApplicationStatus]', e)
    return { success: false, error: 'Failed to update application status' }
  }
}

// ─── CONVERT APPLICANT TO CONTACT ─────────────────────────────────────────────

export async function convertApplicantToContact(id: string) {
  try {
    const tenant = await requireTenant()
    const application = await prisma.jobApplication.findFirst({
      where: { id, tenantId: tenant.id },
    })
    if (!application) return { success: false, error: 'Application not found' }
    if (application.contactId) return { success: false, error: 'Already linked to a contact' }

    const contact = await prisma.contact.create({
      data: {
        tenantId:  tenant.id,
        firstName: application.firstName,
        lastName:  application.lastName,
        emails:    application.email ? [application.email] : [],
        phones:    application.phone ? [application.phone] : [],
        source:    'job_application',
        notes:     `Converted from job application ${id}`,
      },
    })

    await prisma.jobApplication.update({
      where: { id },
      data:  { contactId: contact.id },
    })

    revalidatePath(`/dashboard/jobs/applications/${id}`)
    return { success: true, data: contact }
  } catch (e) {
    console.error('[convertApplicantToContact]', e)
    return { success: false, error: 'Failed to convert applicant to contact' }
  }
}
