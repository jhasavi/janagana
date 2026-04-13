import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const tenantId = session.metadata?.tenantId

        if (tenantId && session.subscription) {
          await prisma.tenantSubscription.update({
            where: { tenantId },
            data: {
              stripeSubscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
              status: 'ACTIVE',
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id

        const tenantSub = await prisma.tenantSubscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        })

        if (tenantSub) {
          const status = subscription.status === 'active' ? 'ACTIVE' :
                        subscription.status === 'past_due' ? 'PAST_DUE' :
                        subscription.status === 'canceled' ? 'CANCELED' :
                        'TRIALING'

          await prisma.tenantSubscription.update({
            where: { id: tenantSub.id },
            data: {
              status,
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id

        const tenantSub = await prisma.tenantSubscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        })

        if (tenantSub) {
          await prisma.tenantSubscription.update({
            where: { id: tenantSub.id },
            data: {
              status: 'CANCELED',
            },
          })
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
