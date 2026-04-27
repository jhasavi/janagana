import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function logDbError(
  operation: string,
  metadata: { tenantId?: string; clerkOrgId?: string; userId?: string; route?: string; attempt?: number } = {},
  error: unknown
) {
  let message: string
  let stack: string | undefined

  if (error instanceof Error) {
    message = error.message
    stack = error.stack
  } else if (error && typeof error === 'object') {
    try {
      message = JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    } catch {
      message = String(error)
    }
  } else {
    message = String(error)
  }

  const payload = {
    operation,
    ...Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined)),
    message,
    stack,
  }

  console.error('[db]', payload)
}

function isTransientPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return [
      'P1001', // server was not reachable
      'P1002', // database connection timed out
      'P1003', // database timed out
      'P1004', // database server closed connection
      'P1010', // raw query failed
      'P1012', // database is shutting down
      'P2028', // network error
    ].includes(error.code)
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return true
  }

  return /connection|timeout|pool|ECONNRESET|ETIMEDOUT|ECONNREFUSED/i.test(String(error))
}

export async function withDbRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  retries = 1,
  delayMs = 150
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0 && isTransientPrismaError(error)) {
      logDbError(operation, { attempt: 1 }, error)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      return withDbRetry(operation, fn, retries - 1, delayMs)
    }
    throw error
  }
}
