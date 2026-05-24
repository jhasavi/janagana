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

const MAX_RATE_LIMIT_ENTRIES = 10_000

function normalizeIp(raw: string | null) {
  if (!raw) return null
  const value = raw.trim().replace(/^\[|\]$/g, '')
  if (!value) return null
  // Keep parsing intentionally lightweight; this only improves key hygiene.
  const ipv4Like = /^\d{1,3}(\.\d{1,3}){3}$/.test(value)
  const ipv6Like = /^[0-9a-fA-F:]+$/.test(value)
  return ipv4Like || ipv6Like ? value : null
}

function getIp(request: Request): string {
  const headers = request.headers as Headers
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-vercel-forwarded-for'),
    headers.get('x-forwarded-for')?.split(',')[0] ?? null,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeIp(candidate)
    if (normalized) return normalized
  }

  const userAgent = headers.get('user-agent') ?? 'unknown'
  return `unknown:${userAgent.slice(0, 80)}`
}

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }

  if (store.size <= MAX_RATE_LIMIT_ENTRIES) return
  const overflow = store.size - MAX_RATE_LIMIT_ENTRIES
  let removed = 0
  for (const key of store.keys()) {
    store.delete(key)
    removed++
    if (removed >= overflow) break
  }
}

/**
 * Returns true if the request should be rate-limited (i.e., over limit).
 */
export function checkRateLimit(
  request: Request,
  options: RateLimitOptions = {}
): boolean {
  const { maxRequests = 60, windowMs = 60_000 } = options
  const now = Date.now()
  pruneExpiredEntries(now)

  const key = getIp(request)

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
