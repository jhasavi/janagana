'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import type { JobApplicationStatus } from '@prisma/client'
import { requireTenantAdminAccess } from '@/lib/actions/permissions'
import { logAudit } from '@/lib/actions/audit'

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

const ALLOWED_STATUS_TRANSITIONS: Record<JobApplicationStatus, JobApplicationStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED', 'WITHDRAWN'],
  UNDER_REVIEW: ['INTERVIEW', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW: ['OFFER', 'REJECTED', 'WITHDRAWN'],
  OFFER: ['HIRED', 'REJECTED', 'WITHDRAWN'],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
}

export async function updateApplicationStatus(id: string, input: unknown) {
  try {
    const access = await requireTenantAdminAccess('updateApplicationStatus')
    if (!access.success) return access
    const { tenant } = access

    const { status, notes, rejectionReason } = StatusUpdateSchema.parse(input)

    const existing = await prisma.jobApplication.findFirst({
      where: { id, tenantId: tenant.id },
      include: { jobPosting: { select: { title: true } } },
    })
    if (!existing) return { success: false, error: 'Application not found' }

    const allowed = ALLOWED_STATUS_TRANSITIONS[existing.status] ?? []
    if (!allowed.includes(status) && status !== existing.status) {
      return {
        success: false,
        error: `Invalid status transition from ${existing.status} to ${status}`,
      }
    }

    const extra: Record<string, unknown> = {}
    if (status === 'HIRED') extra.hiredAt = new Date()
    if (['UNDER_REVIEW', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'].includes(status)) {
      extra.reviewedAt = new Date()
    }

    const application = await prisma.jobApplication.update({
      where: { id, tenantId: tenant.id },
      data: { status, notes, rejectionReason, ...extra },
    })

    await logAudit({
      tenantId: tenant.id,
      action: 'UPDATE',
      resourceType: 'JobApplication',
      resourceId: application.id,
      resourceName: `${existing.firstName} ${existing.lastName} - ${existing.jobPosting?.title ?? 'Unknown role'}`,
      metadata: {
        statusFrom: existing.status,
        statusTo: status,
        rejectionReason: rejectionReason ?? null,
      },
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
    const access = await requireTenantAdminAccess('convertApplicantToContact')
    if (!access.success) return access
    const { tenant } = access

    const application = await prisma.jobApplication.findFirst({
      where: { id, tenantId: tenant.id },
    })
    if (!application) return { success: false, error: 'Application not found' }
    if (application.contactId) return { success: false, error: 'Already linked to a contact' }

    const normalizedEmail = application.email.trim().toLowerCase()
    const existingContact = await prisma.contact.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ email: normalizedEmail }, { emails: { has: normalizedEmail } }],
      },
    })

    const contact = existingContact
      ? await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            emails: Array.from(
              new Set([...(existingContact.emails ?? []), normalizedEmail].filter(Boolean))
            ),
            phones: Array.from(
              new Set([
                ...(existingContact.phones ?? []),
                application.phone ?? undefined,
              ].filter(Boolean))
            ) as string[],
            notes: [existingContact.notes, `Linked to job application ${id}`]
              .filter(Boolean)
              .join('\n'),
          },
        })
      : await prisma.contact.create({
          data: {
            tenantId:  tenant.id,
            firstName: application.firstName,
            lastName:  application.lastName,
            email:     normalizedEmail,
            emails:    [normalizedEmail],
            phones:    application.phone ? [application.phone] : [],
            source:    'job_application',
            notes:     `Converted from job application ${id}`,
          },
        })

    await prisma.jobApplication.update({
      where: { id },
      data:  { contactId: contact.id },
    })

    await logAudit({
      tenantId: tenant.id,
      action: 'CREATE',
      resourceType: 'JobApplicationContactLink',
      resourceId: application.id,
      resourceName: `${application.firstName} ${application.lastName}`,
      metadata: {
        contactId: contact.id,
        usedExistingContact: !!existingContact,
      },
    })

    revalidatePath(`/dashboard/jobs/applications/${id}`)
    return { success: true, data: contact }
  } catch (e) {
    console.error('[convertApplicantToContact]', e)
    return { success: false, error: 'Failed to convert applicant to contact' }
  }
}
