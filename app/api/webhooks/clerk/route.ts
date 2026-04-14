import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const headerPayload = headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()

  let evt: { type: string; data: Record<string, any> }
  try {
    const wh = new Webhook(webhookSecret)
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof evt
  } catch (err) {
    console.error('Clerk webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = evt

  try {
    switch (type) {
      case 'user.updated': {
        const clerkId: string = data.id
        const primaryEmail: string | undefined =
          data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)?.email_address
        const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ')

        await prisma.user.updateMany({
          where: { clerkId },
          data: {
            ...(primaryEmail ? { email: primaryEmail } : {}),
            ...(fullName ? { fullName } : {}),
            avatarUrl: data.image_url || undefined,
          },
        })
        break
      }

      case 'user.deleted': {
        const clerkId: string = data.id
        await prisma.user.updateMany({
          where: { clerkId },
          data: { isActive: false },
        })
        break
      }

      default:
        // Unhandled event types are ignored
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Clerk webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
