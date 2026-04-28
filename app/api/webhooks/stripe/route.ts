import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  // Initialize Stripe at runtime to avoid build-time errors
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  if (!STRIPE_SECRET_KEY) {
    console.error('[stripe webhook] STRIPE_SECRET_KEY not configured')
    return NextResponse.json(
      { error: 'STRIPE_SECRET_KEY not configured' },
      { status: 500 }
    )
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
  })

  // Rate limit: 100 Stripe webhook calls per minute per IP
  if (checkRateLimit(request, { maxRequests: 100, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET not configured' },
      { status: 500 }
    )
  }

  const headersList = await headers()
  const sig = headersList.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const body = await request.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
  } catch (err) {
    console.warn('[stripe webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`[stripe webhook] type=${event.type} id=${event.id}`)

  let dbError = false

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenantId
      const memberId = session.metadata?.memberId
      if (tenantId && memberId && session.customer) {
        try {
          await prisma.member.update({
            where: { id: memberId },
            data: { stripeCustomerId: session.customer as string },
          })
        } catch (error) {
          console.error('[stripe webhook] Failed to update member stripeCustomerId:', error)
          dbError = true
        }
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const memberId = sub.metadata?.memberId
      if (memberId) {
        try {
          await prisma.member.update({
            where: { id: memberId },
            data: {
              stripeSubscriptionId: sub.id,
              stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
              renewsAt: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : undefined,
            },
          })
        } catch (error) {
          console.error('[stripe webhook] Failed to update member subscription:', error)
          dbError = true
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const memberId = sub.metadata?.memberId
      if (memberId) {
        try {
          await prisma.member.update({
            where: { id: memberId },
            data: { stripeSubscriptionId: null, renewsAt: null },
          })
        } catch (error) {
          console.error('[stripe webhook] Failed to clear member subscription:', error)
          dbError = true
        }
      }
      break
    }

    default:
      console.log(`[stripe webhook] unhandled event type: ${event.type}`)
  }

  // Return 500 if database operations failed to trigger Stripe retry
  if (dbError) {
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
