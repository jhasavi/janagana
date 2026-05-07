import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import crypto from 'crypto'
import { logTenantRequest, type TenantRequestContext } from '@/lib/tenant'

type PluginTenantContextResult =
  | {
      ok: true
      context: TenantRequestContext
    }
  | {
      ok: false
      status: number
      error: string
      route: string
      authPrincipal: string
    }

/**
 * Verify plugin API key and return tenant
 * API keys are stored in ApiKey model with tenant isolation
 */
export async function verifyPluginApiKey(request: NextRequest) {
  const result = await resolvePluginTenantContext(request)
  if (!result.ok) return null
  return result.context.tenant
}

export async function resolvePluginTenantContext(
  request: NextRequest
): Promise<PluginTenantContextResult> {
  const route = request.nextUrl.pathname
  const xApiKey = request.headers.get('x-api-key')?.trim()
  const authorization = request.headers.get('authorization')
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i)
  const bearerApiKey = bearerMatch?.[1]?.trim()
  const apiKey = xApiKey || bearerApiKey

  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
      route,
      authPrincipal: 'api-key:missing',
    }
  }

  // Hash the API key to compare with stored hash
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
  const keyPrefix = extractApiKeyPrefix(apiKey)

  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { tenant: true },
  })

  if (!apiKeyRecord) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
      route,
      authPrincipal: `api-key:${keyPrefix}`,
    }
  }

  if (!apiKeyRecord.isActive) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
      route,
      authPrincipal: `api-key:${keyPrefix}`,
    }
  }

  // Check if key is expired
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
      route,
      authPrincipal: `api-key:${keyPrefix}`,
    }
  }

  const requestedTenantSlug =
    request.headers.get('x-tenant-slug') ??
    request.nextUrl.searchParams.get('tenantSlug')

  if (requestedTenantSlug && requestedTenantSlug !== apiKeyRecord.tenant.slug) {
    return {
      ok: false,
      status: 403,
      error: 'Tenant slug mismatch',
      route,
      authPrincipal: `api-key:${keyPrefix}`,
    }
  }

  // Update last used timestamp (non-blocking)
  try {
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    })
  } catch (error) {
    console.error('[plugin-auth] Failed to update lastUsedAt:', error)
    // Don't fail authentication if timestamp update fails
  }

  const context: TenantRequestContext = {
    tenant: apiKeyRecord.tenant,
    tenantId: apiKeyRecord.tenantId,
    route,
    authPrincipal: `api-key:${keyPrefix}`,
    principalType: 'api-key',
    apiKeyId: apiKeyRecord.id,
    apiKeyPrefix: apiKeyRecord.keyPrefix,
  }

  logTenantRequest('plugin_tenant_context_resolved', context)

  return {
    ok: true,
    context,
  }
}

/**
 * Generate a new API key for a tenant
 */
export function generateApiKey(prefix = 'jg_') {
  const randomBytes = crypto.randomBytes(32).toString('hex')
  return `${prefix}${randomBytes}`
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(apiKey: string) {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Extract prefix from API key (first 8 chars after prefix)
 */
export function extractApiKeyPrefix(apiKey: string) {
  return apiKey.substring(0, 12) // e.g., "jg_live_abc1"
}
