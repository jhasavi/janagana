#!/usr/bin/env tsx
import 'dotenv/config'
import { prisma } from '@/lib/prisma'

function parseArg(name: string) {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  return match ? match.split('=')[1] : undefined
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run in production environment.')
    process.exit(1)
  }

  const confirm = hasFlag('confirm')
  const tenantSlug = parseArg('tenant')

  if (!confirm) {
    console.error('This script will delete local database data. Run with --confirm to proceed.')
    process.exit(1)
  }

  if (tenantSlug) {
    console.log(`Removing data for tenant slug=${tenantSlug}...`)
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) {
      console.error(`Tenant not found: ${tenantSlug}`)
      process.exit(1)
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM "Tenant" WHERE slug = $1`,
      tenantSlug
    )
    console.log('Tenant data removed.')
  } else {
    console.log('No tenant specified. Truncating all public schema tables except migrations...')
    const rows = await prisma.$queryRawUnsafe< { tablename: string }[] >(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_prisma_migrations_lock')`
    )
    const tableNames = rows.map((row) => `"${row.tablename}"`).join(', ')
    if (!tableNames) {
      console.error('No tables found to truncate.')
      process.exit(1)
    }

    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`)
    console.log('All public schema tables truncated.')
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('Reset complete.')
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('Reset failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
