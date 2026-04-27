import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const dbOk = await prisma.$queryRaw`SELECT 1` // simple quick check
    const clerkConfigured = !!process.env.CLERK_SECRET_KEY
    return NextResponse.json({ ok: true, db: !!dbOk, clerkConfigured })
  } catch (err) {
    console.error('[health/onboarding]', err)
    return NextResponse.json({ ok: false, error: 'unhealthy' }, { status: 500 })
  }
}
