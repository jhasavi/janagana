import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

type ClerkOrganizationEvent = {
  type: string
  data: {
    id: string
    name: string
    slug: string
    image_url?: string
  }
}

export async function POST(request: Request) {
  // Rate limit: 100 Clerk webhook calls per minute per IP
  if (checkRateLimit(request, { maxRequests: 100, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    console.error('[clerk webhook] CLERK_WEBHOOK_SECRET not configured')
    return NextResponse.json(
      { error: 'CLERK_WEBHOOK_SECRET not configured' },
      { status: 500 }
    )
  }

  const headersList = await headers()
  const svixId = headersList.get('svix-id')
  const svixTimestamp = headersList.get('svix-timestamp')
  const svixSignature = headersList.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await request.text()
  const wh = new Webhook(WEBHOOK_SECRET)

  let event: ClerkOrganizationEvent
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkOrganizationEvent
  } catch {
    console.warn('[clerk webhook] Invalid svix signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`[clerk webhook] type=${event.type}`)

  if (event.type === 'organization.created') {
    const { id: clerkOrgId, name, slug } = event.data
    await prisma.tenant.upsert({
      where: { clerkOrgId },
      create: {
        clerkOrgId,
        name,
        slug: slug ?? clerkOrgId,
      },
      update: {
        name,
      },
    })
  }

  if (event.type === 'organization.updated') {
    const { id: clerkOrgId, name } = event.data
    await prisma.tenant.updateMany({
      where: { clerkOrgId },
      data: { name },
    })
  }

  if (event.type === 'organization.deleted') {
    const { id: clerkOrgId } = event.data
    await prisma.tenant.updateMany({
      where: { clerkOrgId },
      data: { isActive: false },
    })
  }

  return NextResponse.json({ received: true })
}
