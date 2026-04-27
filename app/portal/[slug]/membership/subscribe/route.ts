import { NextResponse } from 'next/server'
import { createMemberCheckoutSession } from '@/lib/actions/billing'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const result = await createMemberCheckoutSession(slug, process.env.STRIPE_PRICE_ID ?? '')
  if (!result.success || !result.url) {
    return NextResponse.json({ error: result.error ?? 'Unable to create checkout session' }, { status: 500 })
  }
  return NextResponse.redirect(result.url)
}
