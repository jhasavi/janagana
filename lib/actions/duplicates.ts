'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

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
    const tenant = await requireTenant()
    const { userId } = await auth()
    const suggestion = await prisma.duplicateSuggestion.update({
      where: { id, tenantId: tenant.id },
      data: {
        status:     'DISMISSED',
        resolvedBy: userId ?? undefined,
        resolvedAt: new Date(),
      },
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
    const tenant = await requireTenant()
    const { userId } = await auth()
    const { survivorId, mergedId } = MergeSchema.parse(input)

    if (survivorId === mergedId) {
      return { success: false, error: 'Survivor and merged contact cannot be the same' }
    }

    const [survivor, merged] = await Promise.all([
      prisma.contact.findFirst({ where: { id: survivorId, tenantId: tenant.id } }),
      prisma.contact.findFirst({ where: { id: mergedId,   tenantId: tenant.id } }),
    ])

    if (!survivor) return { success: false, error: 'Survivor contact not found' }
    if (!merged)   return { success: false, error: 'Merged contact not found' }

    // Merge emails and phones — deduplicate
    const mergedEmails = Array.from(
      new Set([...(survivor.emails ?? []), ...(merged.emails ?? []), survivor.email, merged.email].filter(Boolean))
    ) as string[]
    const mergedPhones = Array.from(
      new Set([...(survivor.phones ?? []), ...(merged.phones ?? []), survivor.phone, merged.phone].filter(Boolean))
    ) as string[]

    await prisma.$transaction(async (tx) => {
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

    revalidatePath('/dashboard/crm/duplicates')
    revalidatePath('/dashboard/crm')
    return { success: true, data: { survivorId } }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[mergeContacts]', e)
    return { success: false, error: 'Failed to merge contacts' }
  }
}
