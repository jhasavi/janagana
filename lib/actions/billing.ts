'use server'

import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getPortalContext } from '@/lib/actions/portal'

// Helper function to initialize Stripe at runtime
function getStripe() {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }
  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
  })
}

// ─── CREATE PORTAL CHECKOUT SESSION ──────────────────────────────────────────
// Called from the member portal when a member wants to start/renew a subscription.

export async function createMemberCheckoutSession(slug: string, priceId: string, tierId?: string | null) {
  try {
    const ctx = await getPortalContext(slug)
    if (!ctx) return { success: false, error: 'Not authenticated or no membership found' }
    const { member, tenant } = ctx

    const stripe = getStripe()

    // Re-use existing Stripe customer if available
    const customerId = member.stripeCustomerId ?? undefined

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${slug}/membership?billing=success`
    const cancelUrl  = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${slug}/membership`
    const metadata = {
      tenantId: tenant.id,
      memberId: member.id,
      ...(tierId ? { tierId } : {}),
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      customer_email: customerId ? undefined : member.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return { success: true, url: session.url }
  } catch (e) {
    console.error('[createMemberCheckoutSession]', e)
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    return { success: false, error: `Failed to create checkout session: ${errorMessage}` }
  }
}

export async function createEventCheckoutSession(slug: string, eventId: string) {
  try {
    const ctx = await getPortalContext(slug)
    if (!ctx) return { success: false, error: 'Not authenticated or no membership found' }
    const { member, tenant } = ctx

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId: tenant.id, priceCents: { gt: 0 } },
      select: { id: true, title: true, shortSummary: true, description: true, priceCents: true, capacity: true },
    })
    if (!event) return { success: false, error: 'Event not found or not payable' }

    if (event.capacity != null) {
      const confirmedCount = await prisma.eventRegistration.count({
        where: { eventId: event.id, status: { in: ['CONFIRMED', 'ATTENDED'] } },
      })
      if (confirmedCount >= event.capacity) {
        return { success: false, error: 'Event is full' }
      }
    }

    const stripe = getStripe()

    const customerId = member.stripeCustomerId ?? undefined
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${slug}/events?checkout=success`
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${slug}/events`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      customer_email: customerId ? undefined : member.email,
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: event.priceCents,
            product_data: {
              name: event.title,
              description: event.shortSummary ?? event.description ?? undefined,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenantId: tenant.id,
        memberId: member.id,
        eventId: event.id,
        paidAmount: String(event.priceCents),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return { success: true, url: session.url }
  } catch (e) {
    console.error('[createEventCheckoutSession]', e)
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    return { success: false, error: `Failed to create checkout session: ${errorMessage}` }
  }
}

// ─── CREATE BILLING PORTAL SESSION ───────────────────────────────────────────
// Let existing subscribers manage their subscription via Stripe Customer Portal.

export async function createBillingPortalSession(slug: string) {
  try {
    const ctx = await getPortalContext(slug)
    if (!ctx) return { success: false, error: 'Not authenticated or no membership found' }
    const { member } = ctx
    if (!member.stripeCustomerId) {
      return { success: false, error: 'No active subscription found' }
    }

    const stripe = getStripe()

    const session = await stripe.billingPortal.sessions.create({
      customer: member.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${slug}/membership`,
    })

    return { success: true, url: session.url }
  } catch (e) {
    console.error('[createBillingPortalSession]', e)
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    return { success: false, error: `Failed to open billing portal: ${errorMessage}` }
  }
}

// ─── GET MEMBER SUBSCRIPTION STATUS ──────────────────────────────────────────

export async function getMemberSubscription(slug: string) {
  try {
    const ctx = await getPortalContext(slug)
    if (!ctx) return { success: false, data: null }
    const { member } = ctx
    if (!member.stripeSubscriptionId) return { success: true, data: null }

    const stripe = getStripe()

    const sub = await stripe.subscriptions.retrieve(member.stripeSubscriptionId)
    return { success: true, data: sub }
  } catch (e) {
    console.error('[getMemberSubscription]', e)
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    return { success: false, data: null, error: errorMessage }
  }
}
