import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSimplifiedTenantProfile, getSimplifiedTenantProfileValidationErrors, ValidationError } from '@/lib/tenant-profile-simplified'

const HEALTH_CACHE_CONTROL = 'public, max-age=5, s-maxage=15, stale-while-revalidate=30'
const HEALTH_CACHE_TTL_MS = 30_000

type HealthPayload = {
  ok: boolean
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number | string
  checks?: {
    database: {
      ok: boolean
      latencyMs: number
      error: string | null
    }
    clerk: {
      ok: boolean
      error: string | null
    }
    tenantProfile: {
      ok: boolean
      errors: string[]
    }
  }
  app?: {
    id: string
    env: string
    version: string
  }
  profileResolved?: {
    slug: string
    appName: string
    appBaseUrl: string
  } | null
  error?: string
}

let cachedHealth: {
  expiresAt: number
  statusCode: number
  payload: HealthPayload
} | null = null

export async function GET() {
  const now = Date.now()
  if (cachedHealth && cachedHealth.expiresAt > now) {
    return NextResponse.json(cachedHealth.payload, {
      status: cachedHealth.statusCode,
      headers: { 'Cache-Control': HEALTH_CACHE_CONTROL },
    })
  }

  let dbConnected = false
  let dbLatencyMs = 0
  let dbError: string | null = null

  try {
    // Database connectivity check with 5s timeout
    const dbStartTime = Date.now()
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Database query timeout (5s)')),
            5000
          )
        ),
      ])
      dbConnected = true
      dbLatencyMs = Date.now() - dbStartTime
    } catch (err) {
      dbConnected = false
      dbError = err instanceof Error ? err.message : 'Unknown database error'
      dbLatencyMs = Date.now() - dbStartTime
    }

    const clerkConfigured = !!process.env.CLERK_SECRET_KEY
    const tenantProfileErrors = getSimplifiedTenantProfileValidationErrors()
    const tenantProfile = tenantProfileErrors.length === 0 ? getSimplifiedTenantProfile() : null

    const isHealthy = dbConnected && tenantProfileErrors.length === 0 && clerkConfigured

    const payload: HealthPayload = {
      ok: isHealthy,
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? process.uptime() : 'N/A',
      checks: {
        database: {
          ok: dbConnected,
          latencyMs: dbLatencyMs,
          error: dbError,
        },
        clerk: {
          ok: clerkConfigured,
          error: clerkConfigured ? null : 'CLERK_SECRET_KEY not set',
        },
        tenantProfile: {
          ok: tenantProfileErrors.length === 0,
          errors: tenantProfileErrors.map(error => `${error.key}: ${error.message}`),
        },
      },
      app: {
        id: 'janagana',
        env: process.env.NODE_ENV || 'development',
        version: process.env.BUILD_ID || 'unknown',
      },
      profileResolved: tenantProfile
        ? {
            slug: tenantProfile.slug,
            appName: tenantProfile.branding.appName,
            appBaseUrl: tenantProfile.baseUrls.app,
          }
        : null,
    }

    const statusCode = isHealthy ? 200 : 503
    cachedHealth = {
      expiresAt: now + HEALTH_CACHE_TTL_MS,
      statusCode,
      payload,
    }

    return NextResponse.json(payload, {
      status: statusCode,
      headers: { 'Cache-Control': HEALTH_CACHE_CONTROL },
    })
  } catch (err) {
    console.error('[health/onboarding]', err)
    const payload: HealthPayload = {
      ok: false,
      status: 'unhealthy',
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? process.uptime() : 'N/A',
    }
    cachedHealth = {
      expiresAt: now + 10_000,
      statusCode: 500,
      payload,
    }
    return NextResponse.json(payload, {
      status: 500,
      headers: { 'Cache-Control': HEALTH_CACHE_CONTROL },
    })
  }
}
