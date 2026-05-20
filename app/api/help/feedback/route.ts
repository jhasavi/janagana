import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { getTenant } from '@/lib/tenant'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { articleSlug, helpful } = body as { articleSlug?: string; helpful?: boolean }

    if (!articleSlug || typeof helpful !== 'boolean') {
      return NextResponse.json({ error: 'Invalid feedback payload' }, { status: 400 })
    }

    let tenantId: string | null = null
    try {
      const { orgId } = await auth()
      if (orgId) {
        const tenant = await getTenant()
        tenantId = tenant?.id ?? null
      }
    } catch {
      // unauthenticated context — fine
    }

    await prisma.helpFeedback.create({
      data: {
        tenantId: tenantId ?? undefined,
        articleSlug,
        helpful,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[help/feedback]', error)
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
  }
}
