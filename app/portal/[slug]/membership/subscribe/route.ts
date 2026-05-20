import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMemberCheckoutSession } from '@/lib/actions/billing'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const url = new URL(request.url)
  const tierId = url.searchParams.get('tier')

  let priceId = process.env.STRIPE_PRICE_ID ?? ''

  if (tierId) {
    const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const tier = await prisma.membershipTier.findUnique({
      where: { id: tierId },
      select: { tenantId: true, stripePriceId: true, priceCents: true },
    })

    if (!tier || tier.tenantId !== tenant.id) {
      return NextResponse.json({ error: 'Tier not found for this tenant' }, { status: 404 })
    }

    if (tier.stripePriceId) {
      priceId = tier.stripePriceId
    } else if (tier.priceCents > 0 && !priceId) {
      return NextResponse.json({ error: 'Stripe price ID is not configured for this tier' }, { status: 400 })
    }
  }

  if (!priceId) {
    return NextResponse.json({ error: 'Stripe price ID is not configured' }, { status: 500 })
  }

  const result = await createMemberCheckoutSession(slug, priceId)
  if (!result.success || !result.url) {
    return NextResponse.json({ error: result.error ?? 'Unable to create checkout session' }, { status: 500 })
  }
  return NextResponse.redirect(result.url)
}
