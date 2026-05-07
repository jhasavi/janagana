#!/usr/bin/env tsx

import { createClerkClient } from '@clerk/backend'
import { prisma } from '@/lib/prisma'
import { extractApiKeyPrefix, generateApiKey, hashApiKey } from '@/lib/plugin-auth'
import { hasFlag, loadBootstrapEnv, parseArg } from './bootstrap-common'

function requireArg(name: string): string {
  const value = parseArg(name)
  if (!value) {
    throw new Error(`Missing required argument --${name}=...`)
  }
  return value
}

async function main() {
  const { envFile } = loadBootstrapEnv()

  const dryRun = hasFlag('dry-run')
  const emitApiKey = hasFlag('emit-api-key')

  const tenantSlug = requireArg('tenant-slug')
  const orgName = requireArg('org-name')
  const clerkAdminEmail = requireArg('clerk-admin-email')

  const timezone = parseArg('timezone') || process.env.TENANT_ONBOARDING_DEFAULT_TIMEZONE || 'America/New_York'
  const primaryColor =
    parseArg('primary-color') ||
    process.env.TENANT_ONBOARDING_DEFAULT_PRIMARY_COLOR ||
    process.env.TENANT_BRAND_PRIMARY_COLOR ||
    '#4F46E5'

  const keyName = parseArg('default-api-key-name') || process.env.ONBOARDING_DEFAULT_API_KEY_NAME || 'Default Plugin Key'
  const keyPermissions =
    (parseArg('default-api-key-permissions') || process.env.ONBOARDING_DEFAULT_API_KEY_PERMISSIONS || 'contacts:write,events:read')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required')
  }

  console.log('WARNING: bootstrap:provision-tenant is an engineer-assisted break-glass tool.')
  console.log(`Environment source: ${envFile}`)
  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`)

  const clerk = createClerkClient({ secretKey })
  const users = await clerk.users.getUserList({ emailAddress: [clerkAdminEmail] })
  if (users.data.length === 0) {
    throw new Error(`Clerk user not found for email: ${clerkAdminEmail}`)
  }

  const adminUserId = users.data[0].id
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })

  let orgId = existingTenant?.clerkOrgId
  let createdOrg = false

  if (!orgId) {
    if (dryRun) {
      createdOrg = true
      orgId = 'dry_run_org_id'
    } else {
      const org = await clerk.organizations.createOrganization({
        name: orgName,
        createdBy: adminUserId,
      })
      createdOrg = true
      orgId = org.id

      try {
        await clerk.organizations.createOrganizationMembership({
          organizationId: org.id,
          userId: adminUserId,
          role: 'admin',
        })
      } catch {
        // no-op
      }
    }
  }

  let tenantId = existingTenant?.id || 'dry_run_tenant_id'

  if (!dryRun) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantSlug },
      update: {
        name: orgName,
        clerkOrgId: orgId,
        timezone,
        primaryColor,
        isActive: true,
      },
      create: {
        slug: tenantSlug,
        name: orgName,
        clerkOrgId: orgId,
        timezone,
        primaryColor,
        isActive: true,
      },
    })

    tenantId = tenant.id
  }

  const existingKey = dryRun
    ? null
    : await prisma.apiKey.findFirst({
        where: {
          tenantId,
          name: keyName,
          isActive: true,
        },
      })

  let rawApiKey: string | null = null
  let createdDefaultKey = false

  if (!existingKey) {
    createdDefaultKey = true
    if (!dryRun) {
      const generated = generateApiKey('jg_live_')
      await prisma.apiKey.create({
        data: {
          tenantId,
          name: keyName,
          keyHash: hashApiKey(generated),
          keyPrefix: extractApiKeyPrefix(generated),
          permissions: keyPermissions,
          isActive: true,
        },
      })
      rawApiKey = generated
    }
  }

  const summary = {
    dryRun,
    tenantSlug,
    tenantId,
    orgName,
    orgId,
    createdOrg,
    tenantAlreadyExisted: Boolean(existingTenant),
    defaultApiKeyName: keyName,
    defaultApiKeyCreated: createdDefaultKey,
    defaultApiKeyRaw: emitApiKey ? rawApiKey : rawApiKey ? '[hidden: use --emit-api-key to print once]' : null,
    keyPermissions,
  }

  console.log(JSON.stringify(summary, null, 2))
}

main()
  .catch((error) => {
    console.error('[bootstrap-provision-tenant] failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
