import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'
import { prisma } from '@/lib/prisma'

type CsvRow = {
  title: string
  date: string
  location: string
  speaker: string
  description: string
  category: string
  image: string
  attendees: string
  status: string
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

function toEventStart(dateIso: string): Date {
  const day = dateIso.slice(0, 10)
  return new Date(`${day}T18:00:00.000Z`)
}

function makeShortSummary(description: string): string {
  const firstSentence = description.split('.').map((part) => part.trim()).filter(Boolean)[0] ?? description
  return firstSentence.slice(0, 180)
}

function normalizeTag(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function main() {
  const tenantSlug = getArg('tenantSlug') ?? 'purple-wings'
  const csvPath = getArg('file') ?? path.resolve(process.cwd(), '../tpw/past-events-import.csv')
  const apply = process.argv.includes('--apply')

  if (!fs.existsSync(csvPath)) {
    console.error(`[import-tpw-past-events] CSV not found: ${csvPath}`)
    process.exit(1)
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) {
    console.error(`[import-tpw-past-events] Tenant not found: ${tenantSlug}`)
    process.exit(1)
  }

  const csvText = fs.readFileSync(csvPath, 'utf8')
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    console.error('[import-tpw-past-events] CSV parsing errors:')
    parsed.errors.forEach((err) => console.error(`  - ${err.message}`))
    process.exit(1)
  }

  let created = 0
  let updated = 0

  console.log(`[import-tpw-past-events] Mode: ${apply ? 'apply' : 'dry-run'}`)
  console.log(`[import-tpw-past-events] Tenant: ${tenant.slug}`)
  console.log(`[import-tpw-past-events] Rows: ${parsed.data.length}`)

  for (const row of parsed.data) {
    const { start, end } = toDateRange(row.date)
    const startDate = toEventStart(row.date)
    const endDate = new Date(startDate.getTime() + 90 * 60 * 1000)
    const attendeeCount = Number.isFinite(Number(row.attendees)) ? Number(row.attendees) : null
    const image = row.image?.trim()
    const coverImageUrl = image ? `https://www.thepurplewings.org/images/${image}` : null

    const nextTags = [normalizeTag(row.category), MIGRATION_TAG].filter(Boolean)

    const existing = await prisma.event.findFirst({
      where: {
        tenantId: tenant.id,
        title: row.title,
        startDate: {
          gte: start,
          lte: end,
        },
      },
    })

    const payload = {
      title: row.title,
      shortSummary: makeShortSummary(row.description),
      description: row.description,
      startDate,
      endDate,
      location: row.location || null,
      speakerName: row.speaker || null,
      attendeeCount,
      coverImageUrl,
      tags: existing ? Array.from(new Set([...(existing.tags || []), ...nextTags])) : nextTags,
      status: 'COMPLETED' as const,
      format: row.location?.toLowerCase().includes('virtual') ? 'VIRTUAL' as const : 'IN_PERSON' as const,
      priceCents: 0,
      virtualLink: null,
      capacity: null,
    }

    if (!apply) {
      console.log(`- ${existing ? 'UPDATE' : 'CREATE'} ${row.title} (${row.date})`)
      continue
    }

    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: payload,
      })
      updated += 1
    } else {
      await prisma.event.create({
        data: {
          ...payload,
          tenantId: tenant.id,
        },
      })
      created += 1
    }
  }

  if (!apply) {
    console.log('[import-tpw-past-events] Dry-run complete. Re-run with --apply to persist changes.')
    return
  }

  console.log(`[import-tpw-past-events] Completed. created=${created}, updated=${updated}`)
}

main()
  .catch((error) => {
    console.error('[import-tpw-past-events] Failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
