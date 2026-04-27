/**
 * Simple in-memory rate limiter for Next.js API routes and webhook endpoints.
 *
 * Use this at the API route level for public-facing endpoints.
 * For production, replace with Redis-backed rate limiting (e.g., @upstash/ratelimit).
 *
 * Usage:
 *   const limited = checkRateLimit(request, { maxRequests: 20, windowMs: 60_000 })
 *   if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface RateLimitOptions {
  /** Maximum number of requests allowed per window. Default: 60 */
  maxRequests?: number
  /** Window size in milliseconds. Default: 60_000 (1 minute) */
  windowMs?: number
}

interface Window {
  count: number
  resetAt: number
}

// Single in-process store — resets on cold start
const store = new Map<string, Window>()

function getIp(request: Request): string {
  const forwarded = (request.headers as Headers).get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

/**
 * Returns true if the request should be rate-limited (i.e., over limit).
 */
export function checkRateLimit(
  request: Request,
  options: RateLimitOptions = {}
): boolean {
  const { maxRequests = 60, windowMs = 60_000 } = options
  const key = getIp(request)
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  entry.count++
  if (entry.count > maxRequests) {
    return true
  }

  return false
}
