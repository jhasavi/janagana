#!/usr/bin/env tsx
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

type Args = {
  sourceSlug: string
  targetSlug: string
  json: boolean
}

type TenantIdTable = {
  table_schema: string
  table_name: string
  column_name: string
}

type CountRow = { total: bigint; source: bigint; target: bigint }

type DerivedMetric = {
  table: string
  total: number
  source: number
  target: number
  split: boolean
}

const prisma = new PrismaClient()

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') out.json = true
    if (a === '--source-slug') out.sourceSlug = argv[i + 1]
    if (a === '--target-slug') out.targetSlug = argv[i + 1]
  }

  if (!out.sourceSlug || !out.targetSlug) {
    console.error('Usage: npx tsx scripts/tenant-unification-dry-run.ts --source-slug <slug> --target-slug <slug> [--json]')
    process.exit(1)
  }

  return out as Args
}

async function countByTenant(table: string, column: string, sourceId: string, targetId: string) {
  const sql = `
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE "${column}" = $1)::bigint AS source,
      COUNT(*) FILTER (WHERE "${column}" = $2)::bigint AS target
    FROM public."${table}"
  `

  const rows = await prisma.$queryRawUnsafe<CountRow[]>(sql, sourceId, targetId)
  const row = rows[0]
  const source = Number(row.source)
  const target = Number(row.target)

  return {
    table,
    column,
    total: Number(row.total),
    source,
    target,
    split: source > 0 && target > 0,
    wouldUpdateRows: source,
    idempotentNoopAfterApply: true,
  }
}

async function tryDerivedMetric(
  table: string,
  sql: string,
  sourceId: string,
  targetId: string
): Promise<DerivedMetric | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<CountRow[]>(sql, sourceId, targetId)
    const row = rows[0]
    const source = Number(row.source)
    const target = Number(row.target)
    return {
      table,
      total: Number(row.total),
      source,
      target,
      split: source > 0 && target > 0,
    }
  } catch {
    return null
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const [sourceTenant, targetTenant] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug: args.sourceSlug } }),
    prisma.tenant.findUnique({ where: { slug: args.targetSlug } }),
  ])

  if (!sourceTenant) {
    console.error(`Source tenant not found: ${args.sourceSlug}`)
    process.exit(1)
  }
  if (!targetTenant) {
    console.error(`Target tenant not found: ${args.targetSlug}`)
    process.exit(1)
  }

  if (sourceTenant.id === targetTenant.id) {
    console.error('Source and target tenants resolve to the same id. Aborting.')
    process.exit(1)
  }

  const tenantTables = await prisma.$queryRaw<TenantIdTable[]>`
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('tenantId', 'tenant_id')
    ORDER BY table_name
  `

  const tableCounts = [] as Array<{
    table: string
    column: string
    total: number
    source: number
    target: number
    split: boolean
    wouldUpdateRows: number
    idempotentNoopAfterApply: boolean
  }>

  for (const t of tenantTables) {
    tableCounts.push(await countByTenant(t.table_name, t.column_name, sourceTenant.id, targetTenant.id))
  }

  const derivedChecks = (
    await Promise.all([
      tryDerivedMetric(
        'EventRegistration_via_Event',
        `
          SELECT
            COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE e."tenantId" = $1)::bigint AS source,
            COUNT(*) FILTER (WHERE e."tenantId" = $2)::bigint AS target
          FROM public."EventRegistration" r
          JOIN public."Event" e ON e.id = r."eventId"
        `,
        sourceTenant.id,
        targetTenant.id
      ),
      tryDerivedMetric(
        'VolunteerShift_via_Opportunity',
        `
          SELECT
            COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE o."tenantId" = $1)::bigint AS source,
            COUNT(*) FILTER (WHERE o."tenantId" = $2)::bigint AS target
          FROM public."VolunteerShift" s
          JOIN public."VolunteerOpportunity" o ON o.id = s."opportunityId"
        `,
        sourceTenant.id,
        targetTenant.id
      ),
      tryDerivedMetric(
        'VolunteerShiftSignup_via_Opportunity',
        `
          SELECT
            COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE o."tenantId" = $1)::bigint AS source,
            COUNT(*) FILTER (WHERE o."tenantId" = $2)::bigint AS target
          FROM public."VolunteerShiftSignup" ss
          JOIN public."VolunteerShift" s ON s.id = ss."shiftId"
          JOIN public."VolunteerOpportunity" o ON o.id = s."opportunityId"
        `,
        sourceTenant.id,
        targetTenant.id
      ),
      tryDerivedMetric(
        'ClubMembership_via_Club',
        `
          SELECT
            COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE c."tenantId" = $1)::bigint AS source,
            COUNT(*) FILTER (WHERE c."tenantId" = $2)::bigint AS target
          FROM public."ClubMembership" cm
          JOIN public."Club" c ON c.id = cm."clubId"
        `,
        sourceTenant.id,
        targetTenant.id
      ),
      tryDerivedMetric(
        'ForumReply_via_Thread',
        `
          SELECT
            COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE t."tenantId" = $1)::bigint AS source,
            COUNT(*) FILTER (WHERE t."tenantId" = $2)::bigint AS target
          FROM public."ForumReply" fr
          JOIN public."ForumThread" t ON t.id = fr."threadId"
        `,
        sourceTenant.id,
        targetTenant.id
      ),
    ])
  ).filter((v): v is DerivedMetric => v !== null)

  const nonTenantTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = t.table_schema
          AND c.table_name = t.table_name
          AND c.column_name IN ('tenantId', 'tenant_id')
      )
    ORDER BY t.table_name
  `

  const nonTenantWithData: Array<{ table: string; total: number }> = []
  for (const table of nonTenantTables) {
    const sql = `SELECT COUNT(*)::bigint AS total FROM public."${table.table_name}"`
    const rows = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(sql)
    const total = Number(rows[0]?.total ?? 0)
    if (total > 0) nonTenantWithData.push({ table: table.table_name, total })
  }

  const tenantTablesWithData = tableCounts.filter((t) => t.source > 0 || t.target > 0)

  const summary = {
    sourceTenant: {
      id: sourceTenant.id,
      slug: sourceTenant.slug,
      clerkOrgId: sourceTenant.clerkOrgId,
      name: sourceTenant.name,
      createdAt: sourceTenant.createdAt,
    },
    targetTenant: {
      id: targetTenant.id,
      slug: targetTenant.slug,
      clerkOrgId: targetTenant.clerkOrgId,
      name: targetTenant.name,
      createdAt: targetTenant.createdAt,
    },
    tenantScopedTableCount: tableCounts.length,
    tenantScopedTablesWithAnyData: tenantTablesWithData.length,
    tenantScopedTablesToUpdateNow: tableCounts.filter((t) => t.wouldUpdateRows > 0).length,
    totalRowsToReassignNow: tableCounts.reduce((acc, t) => acc + t.wouldUpdateRows, 0),
    splitTablesNow: tableCounts.filter((t) => t.split).map((t) => t.table),
    nonTenantTablesWithData: nonTenantWithData,
    idempotencyStatement:
      'Planned apply operation is UPDATE <table> SET tenantId = <target> WHERE tenantId = <source>; rerun will affect 0 rows once source count reaches 0.',
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          summary,
          tenantTableCounts: tableCounts,
          derivedChecks,
        },
        null,
        2
      )
    )
  } else {
    console.log('=== Tenant Unification Dry Run ===')
    console.log(JSON.stringify(summary, null, 2))
    console.log('\n--- Tenant table counts (non-zero only) ---')
    for (const row of tenantTablesWithData) {
      console.log(JSON.stringify(row))
    }
    console.log('\n--- Derived checks ---')
    for (const row of derivedChecks) {
      console.log(JSON.stringify(row))
    }
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
