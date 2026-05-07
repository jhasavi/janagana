import fs from 'node:fs'
import path from 'node:path'
import { config as dotenv } from 'dotenv'
import { expand as dotenvExpand } from 'dotenv-expand'
import type { PrismaClient } from '@prisma/client'

export type MigrationReadiness = {
  ok: boolean
  summary: string
  details: {
    migrationFilesCount: number
    hasMigrationsTable: boolean
    migrationsRows: number
    nonMigrationTableCount: number
  }
  recommendation: string
}

export function parseArg(name: string): string | undefined {
  const prefixed = `--${name}=`
  const match = process.argv.find((value) => value.startsWith(prefixed))
  if (!match) return undefined
  return match.slice(prefixed.length).trim()
}

export function hasFlag(flag: string): boolean {
  return process.argv.includes(`--${flag}`)
}

export function loadBootstrapEnv(): { envFile: string } {
  const explicitEnvFile = parseArg('env-file')

  if (explicitEnvFile) {
    const resolved = path.resolve(process.cwd(), explicitEnvFile)
    if (!fs.existsSync(resolved)) {
      throw new Error(`Env file not found: ${resolved}`)
    }

    dotenvExpand(dotenv({ path: resolved, override: true }))
    return { envFile: resolved }
  }

  const envPath = path.resolve(process.cwd(), '.env')
  const envLocalPath = path.resolve(process.cwd(), '.env.local')

  if (fs.existsSync(envPath)) {
    dotenvExpand(dotenv({ path: envPath, override: false }))
  }

  if (fs.existsSync(envLocalPath)) {
    dotenvExpand(dotenv({ path: envLocalPath, override: true }))
  }

  return { envFile: fs.existsSync(envLocalPath) ? envLocalPath : envPath }
}

export function countMigrationFiles(): number {
  const migrationsDir = path.resolve(process.cwd(), 'prisma', 'migrations')
  if (!fs.existsSync(migrationsDir)) return 0

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .length
}

export async function getMigrationReadiness(prisma: PrismaClient): Promise<MigrationReadiness> {
  const migrationFilesCount = countMigrationFiles()

  const migrationsTableResult = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists`
  )
  const hasMigrationsTable = Boolean(migrationsTableResult[0]?.exists)

  let migrationsRows = 0
  if (hasMigrationsTable) {
    const rowsResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM "_prisma_migrations"`
    )
    migrationsRows = Number(rowsResult[0]?.count ?? 0)
  }

  const nonMigrationTableResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int AS count
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
       AND table_name <> '_prisma_migrations'`
  )
  const nonMigrationTableCount = Number(nonMigrationTableResult[0]?.count ?? 0)

  const migrationHistoryMissing = migrationFilesCount === 0 || !hasMigrationsTable || migrationsRows === 0
  const dbNonEmpty = nonMigrationTableCount > 0

  if (migrationHistoryMissing && dbNonEmpty) {
    return {
      ok: false,
      summary: 'Database is non-empty but Prisma migration history is missing or incomplete.',
      details: {
        migrationFilesCount,
        hasMigrationsTable,
        migrationsRows,
        nonMigrationTableCount,
      },
      recommendation:
        'Stop and use engineer-approved baseline policy: create/import Prisma migration history (baseline) before using db:migrate:deploy. If baseline is intentionally deferred, require explicit engineer sign-off and use db:push for that isolated environment.',
    }
  }

  if (migrationFilesCount === 0) {
    return {
      ok: false,
      summary: 'No migration files were found in prisma/migrations.',
      details: {
        migrationFilesCount,
        hasMigrationsTable,
        migrationsRows,
        nonMigrationTableCount,
      },
      recommendation:
        'Do not run db:migrate:deploy until migration policy is established. Engineer must either generate/commit baseline migrations or formally approve db:push for isolated-client bootstrap.',
    }
  }

  if (!hasMigrationsTable || migrationsRows === 0) {
    return {
      ok: false,
      summary: 'Prisma migration table is missing or empty in target database.',
      details: {
        migrationFilesCount,
        hasMigrationsTable,
        migrationsRows,
        nonMigrationTableCount,
      },
      recommendation:
        'Engineer must initialize migration history (baseline) before db:migrate:deploy. Avoid leaving operators to choose migration strategy ad hoc.',
    }
  }

  return {
    ok: true,
    summary: 'Migration readiness checks passed.',
    details: {
      migrationFilesCount,
      hasMigrationsTable,
      migrationsRows,
      nonMigrationTableCount,
    },
    recommendation: 'Safe to proceed with db:migrate:deploy under current migration policy.',
  }
}
