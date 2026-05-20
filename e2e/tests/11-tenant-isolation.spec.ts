import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

test('tenant isolation prevents Tenant A from accessing Tenant B events', async ({ page }) => {
  const tenantId = `tenant-${randomUUID()}`
  const tenantSlug = `tenant-isolation-${Date.now()}`
  const eventTitle = `Isolation Event ${randomUUID().slice(0, 6)}`

  const tenant = await prisma.tenant.create({
    data: {
      id: tenantId,
      clerkOrgId: `clerk-${tenantId}`,
      name: `Isolation Tenant ${Date.now()}`,
      slug: tenantSlug,
      updatedAt: new Date(),
    },
  })

  const event = await prisma.event.create({
    data: {
      title: eventTitle,
      tenantId: tenant.id,
      status: 'PUBLISHED',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  })

  try {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto('/dashboard/events', { waitUntil: 'networkidle' })
    await expect(page.locator(`text=${eventTitle}`)).not.toBeVisible()

    const response = await page.goto(`/dashboard/events/${event.id}`, { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(404)
  } finally {
    await prisma.event.delete({ where: { id: event.id } }).catch(() => undefined)
    await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined)
    await prisma.$disconnect()
  }
})