'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'
import { requireTenantAdminAccess } from '@/lib/actions/permissions'
import { logAudit } from '@/lib/actions/audit'

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getDuplicateSuggestions(opts?: { status?: string }) {
  try {
    const tenant = await requireTenant()
    const suggestions = await prisma.duplicateSuggestion.findMany({
      where: {
        tenantId: tenant.id,
        ...(opts?.status
          ? { status: opts.status as import('@prisma/client').DuplicateStatus }
          : { status: 'PENDING' }),
      },
      include: {
        contactA: { select: { id: true, firstName: true, lastName: true, emails: true, email: true } },
        contactB: { select: { id: true, firstName: true, lastName: true, emails: true, email: true } },
      },
      orderBy: { confidenceScore: 'desc' },
    })
    return { success: true, data: suggestions }
  } catch (e) {
    console.error('[getDuplicateSuggestions]', e)
    return { success: false, error: 'Failed to load suggestions', data: [] }
  }
}

export async function getDuplicateSuggestion(id: string) {
  try {
    const tenant = await requireTenant()
    const suggestion = await prisma.duplicateSuggestion.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        contactA: true,
        contactB: true,
      },
    })
    if (!suggestion) return { success: false, error: 'Suggestion not found', data: null }
    return { success: true, data: suggestion }
  } catch (e) {
    console.error('[getDuplicateSuggestion]', e)
    return { success: false, error: 'Failed to load suggestion', data: null }
  }
}

// ─── DISMISS ─────────────────────────────────────────────────────────────────

export async function dismissDuplicate(id: string) {
  try {
    const access = await requireTenantAdminAccess('dismissDuplicate')
    if (!access.success) return access
    const { tenant, userId } = access

    const existing = await prisma.duplicateSuggestion.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        contactA: { select: { firstName: true, lastName: true } },
        contactB: { select: { firstName: true, lastName: true } },
      },
    })
    if (!existing) return { success: false, error: 'Suggestion not found' }
    if (existing.status !== 'PENDING') {
      return { success: false, error: 'Only pending suggestions can be dismissed' }
    }

    const suggestion = await prisma.duplicateSuggestion.update({
      where: { id, tenantId: tenant.id },
      data: {
        status:     'DISMISSED',
        resolvedBy: userId ?? undefined,
        resolvedAt: new Date(),
      },
    })

    await logAudit({
      tenantId: tenant.id,
      action: 'UPDATE',
      resourceType: 'DuplicateSuggestion',
      resourceId: suggestion.id,
      resourceName: `${existing.contactA.firstName} ${existing.contactA.lastName} <> ${existing.contactB.firstName} ${existing.contactB.lastName}`,
      metadata: { statusFrom: existing.status, statusTo: 'DISMISSED' },
    })

    revalidatePath('/dashboard/crm/duplicates')
    return { success: true, data: suggestion }
  } catch (e) {
    console.error('[dismissDuplicate]', e)
    return { success: false, error: 'Failed to dismiss suggestion' }
  }
}

// ─── MERGE ────────────────────────────────────────────────────────────────────

const MergeSchema = z.object({
  survivorId: z.string().min(1, 'Survivor contact ID required'),
  mergedId:   z.string().min(1, 'Merged contact ID required'),
})

/**
 * Merge two contacts. The survivor keeps its id; the merged contact is soft-deleted.
 * Emails and phones from the merged contact are appended to the survivor.
 * All relations (donations, event registrations, etc.) on the merged contact
 * are re-pointed to the survivor.
 *
 * This is an audited, admin-only operation.
 */
export async function mergeContacts(suggestionId: string, input: unknown) {
  try {
    const access = await requireTenantAdminAccess('mergeContacts')
    if (!access.success) return access
    const { tenant, userId } = access

    const { survivorId, mergedId } = MergeSchema.parse(input)

    if (survivorId === mergedId) {
      return { success: false, error: 'Survivor and merged contact cannot be the same' }
    }

    const [suggestion, survivor, merged] = await Promise.all([
      prisma.duplicateSuggestion.findFirst({
        where: { id: suggestionId, tenantId: tenant.id },
      }),
      prisma.contact.findFirst({ where: { id: survivorId, tenantId: tenant.id } }),
      prisma.contact.findFirst({ where: { id: mergedId,   tenantId: tenant.id } }),
    ])

    if (!suggestion) return { success: false, error: 'Duplicate suggestion not found' }
    if (suggestion.status !== 'PENDING') {
      return { success: false, error: 'Only pending suggestions can be merged' }
    }

    const isSuggestedPair =
      (suggestion.contactAId === survivorId && suggestion.contactBId === mergedId) ||
      (suggestion.contactAId === mergedId && suggestion.contactBId === survivorId)
    if (!isSuggestedPair) {
      return { success: false, error: 'Selected contacts do not match this suggestion' }
    }

    if (!survivor) return { success: false, error: 'Survivor contact not found' }
    if (!merged)   return { success: false, error: 'Merged contact not found' }
    if (merged.tags?.includes('__merged__')) {
      return { success: false, error: 'Merged contact is already archived from a prior merge' }
    }

    // Merge emails and phones — deduplicate
    const mergedEmails = Array.from(
      new Set([...(survivor.emails ?? []), ...(merged.emails ?? []), survivor.email, merged.email].filter(Boolean))
    ) as string[]
    const mergedPhones = Array.from(
      new Set([...(survivor.phones ?? []), ...(merged.phones ?? []), survivor.phone, merged.phone].filter(Boolean))
    ) as string[]

    await prisma.$transaction(async (tx) => {
      // Prevent unique collisions by deleting merged records that conflict with
      // an already-existing survivor record for the same parent entity.
      const [mergedEventRegs, mergedVolunteerSignups, mergedClubMemberships, mergedEnrollments] = await Promise.all([
        tx.eventRegistration.findMany({
          where: { contactId: mergedId },
          select: { id: true, eventId: true },
        }),
        tx.volunteerSignup.findMany({
          where: { contactId: mergedId },
          select: { id: true, opportunityId: true },
        }),
        tx.clubMembership.findMany({
          where: { contactId: mergedId },
          select: { id: true, clubId: true },
        }),
        tx.membershipEnrollment.findMany({
          where: { tenantId: tenant.id, contactId: mergedId },
          select: { id: true, tierId: true, startDate: true },
        }),
      ])

      if (mergedEventRegs.length > 0) {
        const survivorRegs = await tx.eventRegistration.findMany({
          where: {
            contactId: survivorId,
            eventId: { in: mergedEventRegs.map((r) => r.eventId) },
          },
          select: { eventId: true },
        })
        const conflictEventIds = new Set(survivorRegs.map((r) => r.eventId))
        const conflictingMergedIds = mergedEventRegs
          .filter((r) => conflictEventIds.has(r.eventId))
          .map((r) => r.id)
        if (conflictingMergedIds.length > 0) {
          await tx.eventRegistration.deleteMany({ where: { id: { in: conflictingMergedIds } } })
        }
      }

      if (mergedVolunteerSignups.length > 0) {
        const survivorSignups = await tx.volunteerSignup.findMany({
          where: {
            contactId: survivorId,
            opportunityId: { in: mergedVolunteerSignups.map((s) => s.opportunityId) },
          },
          select: { opportunityId: true },
        })
        const conflictOpportunityIds = new Set(survivorSignups.map((s) => s.opportunityId))
        const conflictingMergedIds = mergedVolunteerSignups
          .filter((s) => conflictOpportunityIds.has(s.opportunityId))
          .map((s) => s.id)
        if (conflictingMergedIds.length > 0) {
          await tx.volunteerSignup.deleteMany({ where: { id: { in: conflictingMergedIds } } })
        }
      }

      if (mergedClubMemberships.length > 0) {
        const survivorMemberships = await tx.clubMembership.findMany({
          where: {
            contactId: survivorId,
            clubId: { in: mergedClubMemberships.map((m) => m.clubId) },
          },
          select: { clubId: true },
        })
        const conflictClubIds = new Set(survivorMemberships.map((m) => m.clubId))
        const conflictingMergedIds = mergedClubMemberships
          .filter((m) => conflictClubIds.has(m.clubId))
          .map((m) => m.id)
        if (conflictingMergedIds.length > 0) {
          await tx.clubMembership.deleteMany({ where: { id: { in: conflictingMergedIds } } })
        }
      }

      if (mergedEnrollments.length > 0) {
        const survivorEnrollments = await tx.membershipEnrollment.findMany({
          where: { tenantId: tenant.id, contactId: survivorId },
          select: { tierId: true, startDate: true },
        })
        const survivorEnrollmentKeys = new Set(
          survivorEnrollments.map((e) => `${e.tierId ?? 'none'}::${e.startDate.toISOString()}`)
        )
        const conflictingMergedIds = mergedEnrollments
          .filter((e) => survivorEnrollmentKeys.has(`${e.tierId ?? 'none'}::${e.startDate.toISOString()}`))
          .map((e) => e.id)
        if (conflictingMergedIds.length > 0) {
          await tx.membershipEnrollment.deleteMany({ where: { id: { in: conflictingMergedIds } } })
        }
      }

      // Re-point relations from merged → survivor
      await tx.donation.updateMany({
        where: { tenantId: tenant.id, contactId: mergedId },
        data:  { contactId: survivorId },
      })
      await tx.eventRegistration.updateMany({
        where: { contactId: mergedId },
        data:  { contactId: survivorId },
      })
      await tx.volunteerSignup.updateMany({
        where: { contactId: mergedId },
        data:  { contactId: survivorId },
      })
      await tx.clubMembership.updateMany({
        where: { contactId: mergedId },
        data:  { contactId: survivorId },
      })
      await tx.membershipEnrollment.updateMany({
        where: { tenantId: tenant.id, contactId: mergedId },
        data:  { contactId: survivorId },
      })
      await tx.officerTerm.updateMany({
        where: { tenantId: tenant.id, contactId: mergedId },
        data:  { contactId: survivorId },
      })
      await tx.committeeMembership.updateMany({
        where: { tenantId: tenant.id, contactId: mergedId },
        data:  { contactId: survivorId },
      })
      await tx.contactDocument.updateMany({
        where: { tenantId: tenant.id, contactId: mergedId },
        data:  { contactId: survivorId },
      })
      await tx.contactCustomFieldValue.updateMany({
        where: { contactId: mergedId },
        data:  { contactId: survivorId },
      })
      await tx.jobApplication.updateMany({
        where: { tenantId: tenant.id, contactId: mergedId },
        data:  { contactId: survivorId },
      })

      // Update survivor with merged emails/phones and preserve notes
      await tx.contact.update({
        where: { id: survivorId },
        data: {
          emails: mergedEmails,
          phones: mergedPhones,
          notes: [survivor.notes, merged.notes ? `[Merged] ${merged.notes}` : '']
            .filter(Boolean)
            .join('\n'),
        },
      })

      // Soft-delete the merged contact by marking it inactive
      await tx.contact.update({
        where: { id: mergedId },
        data:  { tags: [...(merged.tags ?? []), '__merged__'] },
      })

      // Mark suggestion as resolved
      await tx.duplicateSuggestion.update({
        where: { id: suggestionId, tenantId: tenant.id },
        data: {
          status:       'MERGED',
          mergedIntoId: survivorId,
          resolvedBy:   userId ?? undefined,
          resolvedAt:   new Date(),
        },
      })

      // Dismiss any other pending suggestions that involved the merged contact
      await tx.duplicateSuggestion.updateMany({
        where: {
          tenantId: tenant.id,
          status:   'PENDING',
          OR: [{ contactAId: mergedId }, { contactBId: mergedId }],
        },
        data: {
          status:     'DISMISSED',
          resolvedBy: userId ?? undefined,
          resolvedAt: new Date(),
        },
      })
    })

    await logAudit({
      tenantId: tenant.id,
      action: 'UPDATE',
      resourceType: 'DuplicateSuggestion',
      resourceId: suggestionId,
      resourceName: `${survivor.firstName} ${survivor.lastName} <- ${merged.firstName} ${merged.lastName}`,
      metadata: {
        statusFrom: suggestion.status,
        statusTo: 'MERGED',
        survivorId,
        mergedId,
      },
    })

    revalidatePath('/dashboard/crm/duplicates')
    revalidatePath('/dashboard/crm')
    return { success: true, data: { survivorId } }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[mergeContacts]', e)
    return { success: false, error: 'Failed to merge contacts' }
  }
}
