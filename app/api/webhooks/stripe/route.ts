import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { syncEventRegistrationToActivity } from '@/lib/crm-sync'
import { ensureContactForMember } from '@/lib/contact-linking'

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
      const eventId = session.metadata?.eventId
      const tierId = session.metadata?.tierId
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id

      if (tenantId && memberId && (customerId || subscriptionId || tierId)) {
        try {
          const updateData: {
            stripeCustomerId?: string
            stripeSubscriptionId?: string
            renewsAt?: Date | null
            tierId?: string | null
          } = {}

          if (customerId) updateData.stripeCustomerId = customerId
          if (subscriptionId) {
            updateData.stripeSubscriptionId = subscriptionId
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId)
              updateData.renewsAt = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : null
            } catch (subscriptionError) {
              console.error('[stripe webhook] Failed to retrieve subscription:', subscriptionError)
            }
          }

          if (tierId) {
            const tier = await prisma.membershipTier.findFirst({
              where: { id: tierId, tenantId },
              select: { id: true },
            })
            if (tier) {
              updateData.tierId = tier.id
            } else {
              console.warn('[stripe webhook] Ignoring tierId outside tenant scope:', { tenantId, tierId })
            }
          }

          const member = await prisma.member.update({
            where: { id: memberId, tenantId },
            data: updateData,
          })

          if (tierId || subscriptionId || customerId) {
            const contact = await ensureContactForMember({
              id: member.id,
              tenantId: member.tenantId,
              email: member.email,
              firstName: member.firstName,
              lastName: member.lastName,
              phone: member.phone,
              address: member.address,
              city: member.city,
              state: member.state,
              postalCode: member.postalCode,
              country: member.country,
            })

            const latestEnrollment = await prisma.membershipEnrollment.findFirst({
              where: { tenantId, contactId: contact.id },
              orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
              select: { id: true },
            })

            if (latestEnrollment) {
              await prisma.membershipEnrollment.update({
                where: { id: latestEnrollment.id },
                data: {
                  tierId: updateData.tierId,
                  renewalDate: updateData.renewsAt,
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: subscriptionId,
                  paymentStatus: subscriptionId ? 'active' : undefined,
                },
              })
            }
          }
        } catch (error) {
          console.error('[stripe webhook] Failed to update member subscription state:', error)
          dbError = true
        }
      }

      if (tenantId && eventId && memberId) {
        try {
          const [paidEvent, member] = await Promise.all([
            prisma.event.findFirst({ where: { id: eventId, tenantId } }),
            prisma.member.findFirst({ where: { id: memberId, tenantId } }),
          ])

          if (!paidEvent || !member) {
            console.warn('[stripe webhook] Ignoring paid event registration outside tenant scope:', {
              tenantId,
              eventId,
              memberId,
            })
            break
          }

          const contact = await ensureContactForMember({
            id: member.id,
            tenantId: member.tenantId,
            email: member.email,
            firstName: member.firstName,
            lastName: member.lastName,
            phone: member.phone,
            address: member.address,
            city: member.city,
            state: member.state,
            postalCode: member.postalCode,
            country: member.country,
          })

          const paidAmount =
            typeof session.amount_total === 'number'
              ? session.amount_total
              : Number(session.metadata?.paidAmount ?? 0)
          const existing = await prisma.eventRegistration.findFirst({
            where: { eventId, memberId },
          })

          if (!existing) {
            const reg = await prisma.eventRegistration.create({
              data: {
                eventId,
                memberId,
                contactId: contact.id,
                status: 'CONFIRMED',
                paidAmount,
                stripePaymentId: paymentIntentId,
              },
            })
            await syncEventRegistrationToActivity(reg.id)
          } else {
            await prisma.eventRegistration.update({
              where: { id: existing.id },
              data: {
                status: 'CONFIRMED',
                contactId: contact.id,
                paidAmount,
                stripePaymentId: paymentIntentId,
              },
            })
          }
        } catch (error) {
          console.error('[stripe webhook] Failed to create paid event registration:', error)
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
