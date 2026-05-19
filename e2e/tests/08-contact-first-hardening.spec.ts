import { expect, test } from '@playwright/test'
import { prisma } from '@/lib/prisma'

test.describe('Contact-first hardening flows', () => {
  test('duplicate merge handles relation conflict and writes audit log', async ({ page }) => {
    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } })
    expect(tenant).not.toBeNull()

    const token = Date.now()

    const [memberA, memberB] = await Promise.all([
      prisma.member.create({
        data: {
          tenantId: tenant!.id,
          firstName: 'Merge',
          lastName: 'Survivor',
          email: `merge-survivor-${token}@example.com`,
          status: 'ACTIVE',
        },
      }),
      prisma.member.create({
        data: {
          tenantId: tenant!.id,
          firstName: 'Merge',
          lastName: 'Merged',
          email: `merge-merged-${token}@example.com`,
          status: 'ACTIVE',
        },
      }),
    ])

    const [contactA, contactB, event] = await Promise.all([
      prisma.contact.create({
        data: {
          tenantId: tenant!.id,
          memberId: memberA.id,
          firstName: memberA.firstName,
          lastName: memberA.lastName,
          email: memberA.email,
          emails: [memberA.email],
          phones: [],
          source: 'e2e',
        },
      }),
      prisma.contact.create({
        data: {
          tenantId: tenant!.id,
          memberId: memberB.id,
          firstName: memberB.firstName,
          lastName: memberB.lastName,
          email: memberB.email,
          emails: [memberB.email],
          phones: [],
          source: 'e2e',
        },
      }),
      prisma.event.create({
        data: {
          tenantId: tenant!.id,
          title: `Merge Event ${token}`,
          description: 'merge conflict test event',
          startDate: new Date(Date.now() + 86400000),
          status: 'PUBLISHED',
          format: 'IN_PERSON',
        },
      }),
    ])

    await Promise.all([
      prisma.eventRegistration.create({
        data: {
          eventId: event.id,
          memberId: memberA.id,
          contactId: contactA.id,
          status: 'CONFIRMED',
        },
      }),
      prisma.eventRegistration.create({
        data: {
          eventId: event.id,
          memberId: memberB.id,
          contactId: contactB.id,
          status: 'CONFIRMED',
        },
      }),
    ])

    const suggestion = await prisma.duplicateSuggestion.create({
      data: {
        tenantId: tenant!.id,
        contactAId: contactA.id,
        contactBId: contactB.id,
        confidenceScore: 95,
        matchReason: 'e2e_conflict',
        status: 'PENDING',
      },
    })

    await page.goto(`/dashboard/crm/duplicates/${suggestion.id}/merge`)
    await page.getByRole('button', { name: /Merge Survivor/ }).click()
    await page.getByRole('button', { name: 'Confirm Merge' }).click()
    await expect(page).toHaveURL(/\/dashboard\/crm\/duplicates/)

    const resolved = await prisma.duplicateSuggestion.findUnique({
      where: { id: suggestion.id },
      select: { status: true, mergedIntoId: true },
    })
    expect(resolved?.status).toBe('MERGED')
    expect(resolved?.mergedIntoId).toBeTruthy()

    const eventRegsForSurvivor = await prisma.eventRegistration.count({
      where: { eventId: event.id, contactId: contactA.id },
    })
    expect(eventRegsForSurvivor).toBe(1)

    const mergeAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant!.id,
        action: 'UPDATE',
        resourceType: 'DuplicateSuggestion',
        resourceId: suggestion.id,
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(mergeAudit).not.toBeNull()
  })
})