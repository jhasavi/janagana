'use server'

import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getPortalContext } from '@/lib/actions/portal'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

// ─── CREATE PORTAL CHECKOUT SESSION ──────────────────────────────────────────
// Called from the member portal when a member wants to start/renew a subscription.

export async function createMemberCheckoutSession(slug: string, priceId: string) {
  try {
    const ctx = await getPortalContext(slug)
    if (!ctx) return { success: false, error: 'Not authenticated or no membership found' }
    const { member, tenant } = ctx

    // Re-use existing Stripe customer if available
    const customerId = member.stripeCustomerId ?? undefined

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${slug}/membership?billing=success`
    const cancelUrl  = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${slug}/membership`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      customer_email: customerId ? undefined : member.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tenantId: tenant.id, memberId: member.id },
      subscription_data: {
        metadata: { tenantId: tenant.id, memberId: member.id },
      },
      success_url: successUrl,
      cancel_url:  cancelUrl,
    })

    return { success: true, url: session.url }
  } catch (e) {
    console.error('[createMemberCheckoutSession]', e)
    return { success: false, error: 'Failed to create checkout session' }
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

    const session = await stripe.billingPortal.sessions.create({
      customer: member.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${slug}/membership`,
    })

    return { success: true, url: session.url }
  } catch (e) {
    console.error('[createBillingPortalSession]', e)
    return { success: false, error: 'Failed to open billing portal' }
  }
}

// ─── GET MEMBER SUBSCRIPTION STATUS ──────────────────────────────────────────

export async function getMemberSubscription(slug: string) {
  try {
    const ctx = await getPortalContext(slug)
    if (!ctx) return { success: false, data: null }
    const { member } = ctx
    if (!member.stripeSubscriptionId) return { success: true, data: null }

    const sub = await stripe.subscriptions.retrieve(member.stripeSubscriptionId)
    return { success: true, data: sub }
  } catch (e) {
    console.error('[getMemberSubscription]', e)
    return { success: false, data: null }
  }
}
