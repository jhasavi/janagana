import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import { EventForm } from '../_components/event-form'

export const metadata: Metadata = { title: 'Create Event' }

export default async function NewEventPage() {
  const tenant = await getTenant()
  if (!tenant) redirect('/onboarding')

  return <EventForm />
}
