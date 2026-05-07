#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { getTenantProfile, getTenantProfileValidationErrors } from '../lib/tenant-profile'
import { getMigrationReadiness, hasFlag, loadBootstrapEnv, parseArg } from './bootstrap-common'

const prisma = new PrismaClient()

type CheckStatus = 'pass' | 'fail' | 'warn'

type CheckResult = {
  name: string
  status: CheckStatus
  message: string
}

function addResult(results: CheckResult[], name: string, status: CheckStatus, message: string) {
  results.push({ name, status, message })
}

async function safeFetchJson(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const response = await fetch(url, init)
  let body: unknown = null

  try {
    body = await response.json()
  } catch {
    body = null
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  }
}

async function main() {
  const results: CheckResult[] = []
  const strict = !hasFlag('no-strict')
  const phase = parseArg('phase') || 'post-onboarding'

  const { envFile } = loadBootstrapEnv()
  addResult(results, 'env-source', 'pass', envFile)

  if (phase !== 'pre-onboarding' && phase !== 'post-onboarding') {
    addResult(results, 'phase', 'fail', `Invalid phase: ${phase}. Use pre-onboarding or post-onboarding.`)
    printSummaryAndExit(results, phase)
    return
  }

  addResult(results, 'phase', 'pass', phase)

  const profileErrors = getTenantProfileValidationErrors()
  if (profileErrors.length > 0) {
    addResult(
      results,
      'tenant-profile',
      'fail',
      profileErrors.map((issue) => `${issue.key}: ${issue.message}`).join(' | '),
    )

    printSummaryAndExit(results, phase)
    return
  }

  const profile = getTenantProfile()
  const tenantSlug = parseArg('tenant-slug') || profile.slug
  const baseUrl = (parseArg('base-url') || profile.baseUrls.app).replace(/\/$/, '')
  const pluginApiKey = parseArg('plugin-api-key') || process.env.BOOTSTRAP_PLUGIN_API_KEY
  const mismatchSlug = parseArg('mismatch-slug') || `${tenantSlug}-mismatch`
  const defaultApiKeyName = profile.integrations.defaultApiKeyName

  addResult(results, 'tenant-profile', 'pass', 'valid')
  addResult(
    results,
    'tenant-profile-resolved',
    'pass',
    JSON.stringify({ slug: profile.slug, appName: profile.branding.appName, appBaseUrl: profile.baseUrls.app }),
  )

  try {
    await prisma.$queryRaw`SELECT 1`
    addResult(results, 'database-connectivity', 'pass', 'database reachable')
  } catch (error) {
    addResult(
      results,
      'database-connectivity',
      'fail',
      `failed to connect: ${error instanceof Error ? error.message : String(error)}`,
    )

    printSummaryAndExit(results, phase)
    return
  }

  try {
    const readiness = await getMigrationReadiness(prisma)
    if (readiness.ok) {
      addResult(results, 'migration-readiness', 'pass', readiness.summary)
    } else {
      addResult(
        results,
        'migration-readiness',
        phase === 'pre-onboarding' ? 'fail' : 'warn',
        `${readiness.summary} Recommended next step: ${readiness.recommendation}`,
      )
    }
  } catch (error) {
    addResult(
      results,
      'migration-readiness',
      'fail',
      `Failed to evaluate migration readiness: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const healthResult = await safeFetchJson(`${baseUrl}/api/health/onboarding`)
  if (!healthResult.ok) {
    addResult(results, 'onboarding-health-endpoint', 'fail', `status ${healthResult.status}`)
    printSummaryAndExit(results, phase)
    return
  }

  addResult(results, 'onboarding-health-endpoint', 'pass', `status ${healthResult.status}`)

  const appField =
    typeof healthResult.body === 'object' && healthResult.body !== null && 'app' in healthResult.body
      ? (healthResult.body as Record<string, unknown>).app
      : null
  const appIdentity =
    appField && typeof appField === 'object' && 'id' in appField
      ? (appField as Record<string, unknown>).id
      : null

  if (appIdentity !== 'janagana') {
    addResult(
      results,
      'app-identity',
      'fail',
      `Unexpected app identity at ${baseUrl}. Expected app.id=janagana, got ${String(appIdentity)}.`,
    )
    printSummaryAndExit(results, phase)
    return
  }

  addResult(results, 'app-identity', 'pass', `janagana at ${baseUrl}`)

  if (phase === 'pre-onboarding') {
    addResult(
      results,
      'pre-onboarding-readiness',
      'pass',
      'Environment, DB, migration policy, and app identity checks complete.',
    )
    printSummaryAndExit(results, phase)
    return
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) {
    addResult(results, 'tenant-record', 'fail', `tenant slug not found: ${tenantSlug}`)
    addResult(results, 'default-api-key-provisioning', 'fail', 'cannot verify without tenant record')
    printSummaryAndExit(results, phase)
    return
  }

  addResult(results, 'tenant-record', 'pass', `tenant exists: ${tenant.id}`)

  const defaultApiKey = await prisma.apiKey.findFirst({
    where: {
      tenantId: tenant.id,
      name: defaultApiKeyName,
      isActive: true,
    },
    select: {
      keyPrefix: true,
      permissions: true,
    },
  })

  if (defaultApiKey) {
    addResult(
      results,
      'default-api-key-provisioning',
      'pass',
      `active default key exists (${defaultApiKey.keyPrefix}) with ${defaultApiKey.permissions.length} permission(s)`,
    )
  } else {
    addResult(
      results,
      'default-api-key-provisioning',
      'fail',
      `missing active key named "${defaultApiKeyName}" for tenant ${tenantSlug}`,
    )
  }

  const embedResult = await safeFetchJson(
    `${baseUrl}/api/embed/events?tenantSlug=${encodeURIComponent(tenantSlug)}&maxItems=1`,
  )
  if (embedResult.ok) {
    addResult(results, 'embed-readiness', 'pass', `status ${embedResult.status}`)
  } else {
    addResult(results, 'embed-readiness', 'fail', `status ${embedResult.status}`)
  }

  const embedMismatchResult = await safeFetchJson(
    `${baseUrl}/api/embed/events?tenantSlug=${encodeURIComponent(tenantSlug)}&maxItems=1`,
    {
      headers: {
        'x-tenant-slug': mismatchSlug,
      },
    },
  )

  if (embedMismatchResult.status === 403) {
    addResult(results, 'embed-isolation-guard', 'pass', 'tenant slug mismatch rejected with 403')
  } else {
    addResult(results, 'embed-isolation-guard', 'fail', `expected 403, received ${embedMismatchResult.status}`)
  }

  if (!pluginApiKey) {
    addResult(
      results,
      'plugin-readiness',
      strict ? 'fail' : 'warn',
      'no plugin API key provided (set BOOTSTRAP_PLUGIN_API_KEY or use --plugin-api-key=...)',
    )
    addResult(
      results,
      'plugin-isolation-guard',
      strict ? 'fail' : 'warn',
      'plugin isolation check skipped because API key is missing',
    )
  } else {
    const pluginResult = await safeFetchJson(`${baseUrl}/api/plugin/events?status=PUBLISHED`, {
      headers: {
        'x-api-key': pluginApiKey,
        'x-tenant-slug': tenantSlug,
      },
    })

    if (pluginResult.ok) {
      addResult(results, 'plugin-readiness', 'pass', `status ${pluginResult.status}`)
    } else {
      addResult(results, 'plugin-readiness', 'fail', `status ${pluginResult.status}`)
    }

    const pluginMismatchResult = await safeFetchJson(`${baseUrl}/api/plugin/events?status=PUBLISHED`, {
      headers: {
        'x-api-key': pluginApiKey,
        'x-tenant-slug': mismatchSlug,
      },
    })

    if (pluginMismatchResult.status === 403) {
      addResult(results, 'plugin-isolation-guard', 'pass', 'tenant slug mismatch rejected with 403')
    } else {
      addResult(results, 'plugin-isolation-guard', 'fail', `expected 403, received ${pluginMismatchResult.status}`)
    }
  }

  printSummaryAndExit(results, phase)
}

function printSummaryAndExit(results: CheckResult[], phase: string) {
  console.log(`Isolated-client bootstrap preflight (${phase})`)
  console.log('================================================')

  for (const result of results) {
    const icon = result.status === 'pass' ? 'PASS' : result.status === 'warn' ? 'WARN' : 'FAIL'
    console.log(`[${icon}] ${result.name} -> ${result.message}`)
  }

  const failures = results.filter((result) => result.status === 'fail')
  const warnings = results.filter((result) => result.status === 'warn')

  console.log('\nSummary')
  console.log(`- failures: ${failures.length}`)
  console.log(`- warnings: ${warnings.length}`)
  console.log(`- checks: ${results.length}`)

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error('[bootstrap-preflight] unexpected error', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
