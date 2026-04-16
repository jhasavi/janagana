'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { slugify } from '@/lib/utils'

const OnboardingSchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  timezone: z.string().default('America/New_York'),
  primaryColor: z.string().default('#4F46E5'),
})

export async function completeOnboarding(input: unknown) {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Accept either a plain string (org name) or a full object
    const normalized = typeof input === 'string' ? { orgName: input } : input
    const data = OnboardingSchema.parse(normalized)

    // If the user already has exactly one Clerk org membership, reuse that
    // organization rather than creating a duplicate org with the same name.
    const client = await clerkClient()
    const memberships = await client.users.getOrganizationMembershipList({
      userId,
      limit: 2,
    })

    let org = null
    if (memberships.data.length === 1) {
      org = memberships.data[0].organization
      console.log('[completeOnboarding] reusing existing org', org.id, 'for user', userId)
    } else if (memberships.data.length > 1) {
      return {
        success: false,
        error: 'Multiple organizations already exist for this account. Please sign in to the correct workspace.',
      }
    } else {
      org = await client.organizations.createOrganization({
        name: data.orgName,
        createdBy: userId,
      })

      try {
        const orgMemberships = await client.organizations.getOrganizationMembershipList({
          organizationId: org.id,
          userId: [userId],
          limit: 1,
        })

        if (orgMemberships.data.length === 0) {
          await client.organizations.createOrganizationMembership({
            organizationId: org.id,
            userId,
            role: 'admin',
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.toLowerCase().includes('already') && !message.toLowerCase().includes('membership') && !message.toLowerCase().includes('duplicate')) {
          throw error
        }
      }
    }

    // Create or update Tenant in DB synced to Clerk org. If a tenant already
    // exists for this Clerk org id, update its basic fields. Otherwise create
    // a new tenant while ensuring slug uniqueness.
    const existing = await prisma.tenant.findUnique({ where: { clerkOrgId: org.id } })
    let tenant
    if (existing) {
      tenant = await prisma.tenant.update({
        where: { id: existing.id },
        data: {
          name: data.orgName,
          timezone: data.timezone,
          primaryColor: data.primaryColor,
        },
      })
      console.log('[completeOnboarding] updated existing tenant', tenant.id, 'for org', org.id)
    } else {
      const baseSlug = slugify(data.orgName)
      let slug = baseSlug
      let attempt = 0

      while (await prisma.tenant.findUnique({ where: { slug } })) {
        attempt++
        slug = `${baseSlug}-${attempt}`
      }

      tenant = await prisma.tenant.create({
        data: {
          clerkOrgId: org.id,
          name: data.orgName,
          slug,
          timezone: data.timezone,
          primaryColor: data.primaryColor,
        },
      })

      console.log('[completeOnboarding] created org', org.id, 'tenant', tenant.id)
    }
    revalidatePath('/dashboard')
    return { success: true, data: { tenant, orgId: org.id } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('[completeOnboarding]', error)
    return { success: false, error: 'Failed to set up organization' }
  }
}

export async function getTenantSettings() {
  try {
    const tenant = await getTenant()
    if (!tenant) return { success: false, error: 'No organization', data: null }

    return { success: true, data: tenant }
  } catch (error) {
    console.error('[getTenantSettings] DB error', error)
    return { success: false, error: 'Failed to load settings', data: null }
  }
}

const SettingsSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(40, 'Slug must be 40 characters or fewer')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  timezone: z.string(),
  primaryColor: z.string(),
  logoUrl: z.string().url().optional().or(z.literal('')),
})

export async function updateTenantSettings(input: unknown) {
  try {
    const tenant = await getTenant()
    if (!tenant) return { success: false, error: 'No organization' }

    const data = SettingsSchema.parse(input)

    if (data.slug !== tenant.slug) {
      const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } })
      if (existing) {
        return { success: false, error: 'That slug is already in use. Please choose a different one.' }
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: data.name,
        slug: data.slug,
        timezone: data.timezone,
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl || null,
      },
    })

    revalidatePath('/dashboard/settings')
    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('[updateTenantSettings] DB error', error)
    return { success: false, error: 'Failed to update settings' }
  }
}

// Dashboard overview stats
export async function getDashboardStats() {
  try {
    const tenant = await getTenant()
    if (!tenant) return { success: false, error: 'No organization', data: null }

    const now = new Date()

    const [
      totalMembers,
      activeMembers,
      totalEvents,
      upcomingEvents,
      totalOpportunities,
      openOpportunities,
      totalVolunteerHours,
    ] = await Promise.all([
      prisma.member.count({ where: { tenantId: tenant.id } }),
      prisma.member.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }),
      prisma.event.count({ where: { tenantId: tenant.id } }),
      prisma.event.count({
        where: { tenantId: tenant.id, startDate: { gte: now }, status: 'PUBLISHED' },
      }),
      prisma.volunteerOpportunity.count({ where: { tenantId: tenant.id } }),
      prisma.volunteerOpportunity.count({
        where: { tenantId: tenant.id, status: 'OPEN' },
      }),
      prisma.volunteerSignup.aggregate({
        where: {
          opportunity: { tenantId: tenant.id },
          hoursLogged: { not: null },
        },
        _sum: { hoursLogged: true },
      }),
    ])

    return {
      success: true,
      data: {
        totalMembers,
        activeMembers,
        totalEvents,
        upcomingEvents,
        totalOpportunities,
        openOpportunities,
        totalVolunteerHours: totalVolunteerHours._sum.hoursLogged ?? 0,
      },
    }
  } catch (error) {
    console.error('[getDashboardStats] DB error', error)
    return { success: false, error: 'Failed to load stats', data: null }
  }
}
