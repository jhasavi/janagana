#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { getSimplifiedTenantProfileValidationErrors } from '../lib/tenant-profile-simplified'
import { getMigrationReadiness, loadBootstrapEnv } from './bootstrap-common'

type CheckResult = {
  name: string
  ok: boolean
  message: string
}

const prisma = new PrismaClient()

const REQUIRED_RUNTIME_VARS = [
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
]

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0)
}

async function main() {
  const { envFile } = loadBootstrapEnv()
  const checks: CheckResult[] = []

  checks.push({
    name: 'env-source',
    ok: true,
    message: envFile,
  })

  for (const envVar of REQUIRED_RUNTIME_VARS) {
    const present = hasValue(process.env[envVar])
    checks.push({
      name: envVar,
      ok: present,
      message: present ? 'present' : 'missing',
    })
  }

  const hasAppBaseUrl = hasValue(process.env.TENANT_APP_BASE_URL) || hasValue(process.env.NEXT_PUBLIC_APP_URL)
  checks.push({
    name: 'app-base-url',
    ok: hasAppBaseUrl,
    message: hasAppBaseUrl
      ? `resolved from ${hasValue(process.env.TENANT_APP_BASE_URL) ? 'TENANT_APP_BASE_URL' : 'NEXT_PUBLIC_APP_URL'}`
      : 'missing TENANT_APP_BASE_URL and NEXT_PUBLIC_APP_URL',
  })

  const tenantProfileErrors = getSimplifiedTenantProfileValidationErrors()
  const tenantProfileOk = tenantProfileErrors.length === 0

  checks.push({
    name: 'tenant-profile',
    ok: tenantProfileOk,
    message: tenantProfileOk
      ? 'valid'
      : tenantProfileErrors.map((error) => `${error.key}: ${error.message}`).join(' | '),
  })

  try {
    const readiness = await getMigrationReadiness(prisma)
    checks.push({
      name: 'migration-readiness',
      ok: readiness.ok,
      message: readiness.ok
        ? readiness.summary
        : `${readiness.summary} Recommended next step: ${readiness.recommendation}`,
    })
  } catch (error) {
    checks.push({
      name: 'migration-readiness',
      ok: false,
      message: `Failed to evaluate migration readiness: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  console.log('Bootstrap environment validation')
  console.log('================================')

  for (const check of checks) {
    const icon = check.ok ? 'PASS' : 'FAIL'
    console.log(`[${icon}] ${check.name} -> ${check.message}`)
  }

  const failed = checks.filter((check) => !check.ok)

  if (failed.length > 0) {
    console.error(`\nValidation failed: ${failed.length} check(s) failed.`)
    process.exit(1)
  }

  console.log('\nValidation passed.')
}

main()
  .catch((error) => {
    console.error('[bootstrap-validate-env] unexpected error', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
