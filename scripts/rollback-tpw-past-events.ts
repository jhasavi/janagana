import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'
import { prisma } from '@/lib/prisma'

type CsvRow = {
  title: string
  date: string
}

const MIGRATION_TAG = 'tpw-migrated'

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex((arg) => arg === `--${name}`)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

function toDateRange(dateIso: string): { start: Date; end: Date } {
  const day = dateIso.slice(0, 10)
  return {
    start: new Date(`${day}T00:00:00.000Z`),
    end: new Date(`${day}T23:59:59.999Z`),
  }
}

async function main() {
  const tenantSlug = getArg('tenantSlug') ?? 'purple-wings'
  const csvPath = getArg('file') ?? path.resolve(process.cwd(), '../tpw/past-events-import.csv')
  const apply = process.argv.includes('--apply')

  if (!fs.existsSync(csvPath)) {
    console.error(`[rollback-tpw-past-events] CSV not found: ${csvPath}`)
    process.exit(1)
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) {
    console.error(`[rollback-tpw-past-events] Tenant not found: ${tenantSlug}`)
    process.exit(1)
  }

  const csvText = fs.readFileSync(csvPath, 'utf8')
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    console.error('[rollback-tpw-past-events] CSV parsing errors:')
    parsed.errors.forEach((err) => console.error(`  - ${err.message}`))
    process.exit(1)
  }

  console.log(`[rollback-tpw-past-events] Mode: ${apply ? 'apply' : 'dry-run'}`)

  let deleted = 0

  for (const row of parsed.data) {
    const { start, end } = toDateRange(row.date)
    const event = await prisma.event.findFirst({
      where: {
        tenantId: tenant.id,
        title: row.title,
        startDate: {
          gte: start,
          lte: end,
        },
        tags: {
          has: MIGRATION_TAG,
        },
      },
    })

    if (!event) {
      console.log(`- SKIP ${row.title} (${row.date})`)
      continue
    }

    if (!apply) {
      console.log(`- DELETE ${row.title} (${row.date})`)
      continue
    }

    await prisma.event.delete({ where: { id: event.id } })
    deleted += 1
  }

  if (!apply) {
    console.log('[rollback-tpw-past-events] Dry-run complete. Re-run with --apply to delete migrated rows.')
    return
  }

  console.log(`[rollback-tpw-past-events] Completed. deleted=${deleted}`)
}

main()
  .catch((error) => {
    console.error('[rollback-tpw-past-events] Failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
