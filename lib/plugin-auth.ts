import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import crypto from 'crypto'

/**
 * Verify plugin API key and return tenant
 * API keys are stored in ApiKey model with tenant isolation
 */
export async function verifyPluginApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') ||
                 request.headers.get('authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    console.warn('[plugin-auth] Missing API key in request headers')
    return null
  }

  // Hash the API key to compare with stored hash
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
  const keyPrefix = extractApiKeyPrefix(apiKey)

  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { tenant: true },
  })

  if (!apiKeyRecord) {
    console.warn(`[plugin-auth] Invalid API key: ${keyPrefix}`)
    return null
  }

  if (!apiKeyRecord.isActive) {
    console.warn(`[plugin-auth] Inactive API key: ${keyPrefix} for tenant: ${apiKeyRecord.tenant.slug}`)
    return null
  }

  // Check if key is expired
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    console.warn(`[plugin-auth] Expired API key: ${keyPrefix} for tenant: ${apiKeyRecord.tenant.slug}`)
    return null
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

  return apiKeyRecord.tenant
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
