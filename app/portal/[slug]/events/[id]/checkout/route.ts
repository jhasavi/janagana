import { NextResponse } from 'next/server'
import { createEventCheckoutSession } from '@/lib/actions/billing'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const result = await createEventCheckoutSession(slug, id)
  if (!result.success || !result.url) {
    return NextResponse.json({ error: result.error ?? 'Unable to create checkout session' }, { status: 500 })
  }
  return NextResponse.redirect(result.url)
}
