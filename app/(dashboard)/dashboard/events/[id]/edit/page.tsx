import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEvent } from '@/lib/actions/events'
import { EventForm } from '../../_components/event-form'

export const metadata: Metadata = { title: 'Edit Event' }

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getEvent(id)

  if (!result.success || !result.data) notFound()

  return <EventForm event={result.data} />
}
