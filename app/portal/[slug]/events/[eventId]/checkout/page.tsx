import { redirect } from 'next/navigation'
import { createEventCheckoutSession } from '@/lib/actions/billing'

export const dynamic = 'force-dynamic'

export default async function EventCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; eventId: string }>
  searchParams: Promise<{ ticketTypeId?: string }>
}) {
  const [{ slug, eventId }, query] = await Promise.all([params, searchParams])
  const ticketTypeId = query.ticketTypeId

  const result = await createEventCheckoutSession(slug, eventId, ticketTypeId)
  if (!result.success || !result.url) {
    // If checkout cannot be created, bring the user back to the events page.
    redirect(`/portal/${slug}/events`)
  }

  redirect(result.url)
}
