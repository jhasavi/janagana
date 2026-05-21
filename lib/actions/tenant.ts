'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { getTenantProfile } from '@/lib/tenant-profile'
import { slugify } from '@/lib/utils'
import { extractApiKeyPrefix, generateApiKey, hashApiKey } from '@/lib/plugin-auth'

function getOnboardingDefaults() {
  try {
    const profile = getTenantProfile()
    return {
      timezone: profile.onboardingDefaults.timezone,
      primaryColor: profile.onboardingDefaults.primaryColor,
    }
  } catch {
    return {
      timezone: process.env.TENANT_ONBOARDING_DEFAULT_TIMEZONE ?? process.env.TENANT_DEFAULT_TIMEZONE ?? 'America/New_York',
      primaryColor:
        process.env.TENANT_ONBOARDING_DEFAULT_PRIMARY_COLOR ?? process.env.TENANT_BRAND_PRIMARY_COLOR ?? '#4F46E5',
    }
  }
}

function normalizeApiKeyPermissions(rawPermissions: string | undefined) {
  const permissions = (rawPermissions ?? 'contacts:write,events:read')
    .split(',')
    .map((permission) => permission.trim())
    .filter(Boolean)

  return permissions.length > 0 ? permissions : ['contacts:write', 'events:read']
}

function getOnboardingSchema() {
  const defaults = getOnboardingDefaults()
  return z.object({
    orgName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
    timezone: z.string().default(defaults.timezone),
    primaryColor: z.string().default(defaults.primaryColor),
  })
}

export async function completeOnboarding(input: unknown) {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Accept either a plain string (org name) or a full object
    const normalized = typeof input === 'string' ? { orgName: input } : input
    const data = getOnboardingSchema().parse(normalized)

    // If the user already belongs to an organization with the same name,
    // reuse that org rather than creating a duplicate.
    const client = await clerkClient()
    const memberships = await client.users.getOrganizationMembershipList({
      userId,
      limit: 100,
    })

    let org = null
    const normalizedOrgName = data.orgName.trim().toLowerCase()
    const existingOrgWithSameName = memberships.data.find(({ organization }) =>
      organization?.name?.trim().toLowerCase() === normalizedOrgName,
    )?.organization

    if (existingOrgWithSameName) {
      org = existingOrgWithSameName
      console.log('[completeOnboarding] reusing existing org', org.id, 'for user', userId)
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
    let tenantCreated = false
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
      tenantCreated = true

      console.log('[completeOnboarding] created org', org.id, 'tenant', tenant.id)
    }

    // Idempotent default API key provisioning for plugin integrations.
    let defaultApiKeyName = 'Default Plugin Key'
    let defaultApiKeyPermissions = ['contacts:write', 'events:read']
    try {
      const profile = getTenantProfile()
      defaultApiKeyName = profile.integrations.defaultApiKeyName
      defaultApiKeyPermissions = profile.integrations.defaultApiKeyPermissions
    } catch {
      defaultApiKeyName = process.env.ONBOARDING_DEFAULT_API_KEY_NAME ?? defaultApiKeyName
      defaultApiKeyPermissions = normalizeApiKeyPermissions(process.env.ONBOARDING_DEFAULT_API_KEY_PERMISSIONS)
    }

    const existingApiKey = await prisma.apiKey.findFirst({
      where: { tenantId: tenant.id, name: defaultApiKeyName, isActive: true },
      select: { id: true },
    })

    let onboardingApiKey: string | undefined
    let apiKeyCreated = false

    if (!existingApiKey) {
      const rawKey = generateApiKey('jg_live_')
      await prisma.apiKey.create({
        data: {
          tenantId: tenant.id,
          name: defaultApiKeyName,
          keyHash: hashApiKey(rawKey),
          keyPrefix: extractApiKeyPrefix(rawKey),
          permissions: defaultApiKeyPermissions,
        },
      })
      onboardingApiKey = rawKey
      apiKeyCreated = true
      console.log('[completeOnboarding] created default api key', {
        tenantId: tenant.id,
        keyName: defaultApiKeyName,
      })
    }

    revalidatePath('/dashboard')
    return {
      success: true,
      data: {
        tenant,
        orgId: org.id,
        provisioning: {
          tenantCreated,
          apiKeyCreated,
          defaultApiKeyName,
          apiKey: onboardingApiKey,
        },
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    let message = 'Failed to set up organization'
    if (error instanceof Error) {
      message = error.message || message
    } else if (typeof error === 'string') {
      message = error
    }

    console.error('[completeOnboarding]', error)
    return { success: false, error: message }
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
  donationReceiptFooter: z.string().optional().nullable(),
  donationReceiptDisclaimer: z.string().optional().nullable(),
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
        donationReceiptFooter: data.donationReceiptFooter ?? null,
        donationReceiptDisclaimer: data.donationReceiptDisclaimer ?? null,
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
      pendingCancellationRequests,
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
      prisma.eventCancellationRequest.count({
        where: { tenantId: tenant.id, status: 'REQUESTED' },
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
        pendingCancellationRequests,
        totalVolunteerHours: totalVolunteerHours._sum.hoursLogged ?? 0,
      },
    }
  } catch (error) {
    console.error('[getDashboardStats] DB error', error)
    return { success: false, error: 'Failed to load stats', data: null }
  }
}
