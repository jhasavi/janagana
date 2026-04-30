import { expect, test } from '@playwright/test'
import { prisma } from '@/lib/prisma'

test.describe('Contact-first hardening flows', () => {
  test('governance office create writes audit log', async ({ page }) => {
    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } })
    expect(tenant).not.toBeNull()

    const marker = `QA Office ${Date.now()}`

    await page.goto('/dashboard/governance/offices/new')
    await page.getByLabel('Title *').fill(marker)
    await page.getByLabel('Description').fill('Governance e2e test office')
    await page.getByLabel('Sort Order').fill('15')
    await page.getByRole('button', { name: 'Create Office' }).click()

    await expect(page).toHaveURL(/\/dashboard\/governance/)
    await expect(page.getByText(marker)).toBeVisible()

    const office = await prisma.governanceOffice.findFirst({
      where: { tenantId: tenant!.id, title: marker },
    })
    expect(office).not.toBeNull()

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant!.id,
        action: 'CREATE',
        resourceType: 'GovernanceOffice',
        resourceId: office!.id,
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit).not.toBeNull()
  })

  test('job application status update + convert links contact and audits', async ({ page }) => {
    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'desc' } })
    expect(tenant).not.toBeNull()

    const token = Date.now()
    const job = await prisma.jobPosting.create({
      data: {
        tenantId: tenant!.id,
        title: `QA Role ${token}`,
        description: 'QA role for hardening test',
        status: 'PUBLISHED',
        jobType: 'FULL_TIME',
        isPaid: true,
      },
    })

    const app = await prisma.jobApplication.create({
      data: {
        tenantId: tenant!.id,
        jobPostingId: job.id,
        firstName: 'Flow',
        lastName: 'Tester',
        email: `flow.tester.${token}@example.com`,
        phone: '5550001111',
        source: 'e2e',
      },
    })

    await page.goto(`/dashboard/jobs/applications/${app.id}`)
    await page.getByText('Actions').waitFor()

    await page.getByRole('button', { name: 'Select next status…' }).click()
    await page.getByRole('option', { name: 'Under Review' }).click()
    await page.getByRole('button', { name: 'Update Status' }).click()

    await expect(page.getByText('Under Review')).toBeVisible()

    await page.getByRole('button', { name: 'Convert to Contact' }).click()
    await expect(page.getByRole('button', { name: 'View Contact' })).toBeVisible()

    const updatedApp = await prisma.jobApplication.findUnique({
      where: { id: app.id },
      select: { status: true, contactId: true },
    })
    expect(updatedApp?.status).toBe('UNDER_REVIEW')
    expect(updatedApp?.contactId).toBeTruthy()

    const statusAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant!.id,
        action: 'UPDATE',
        resourceType: 'JobApplication',
        resourceId: app.id,
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(statusAudit).not.toBeNull()

    const convertAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant!.id,
        action: 'CREATE',
        resourceType: 'JobApplicationContactLink',
        resourceId: app.id,
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(convertAudit).not.toBeNull()
  })

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