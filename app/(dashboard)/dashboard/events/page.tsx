import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'
import { getEvents, getEventStats } from '@/lib/actions/events'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EventGrid } from './_components/event-grid'
import { EventFilters } from './_components/event-filters'
import { HelpButton } from '@/components/dashboard/help-button'

export const metadata: Metadata = { title: 'Events' }

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; scope?: 'all' | 'upcoming' | 'past' }>
}) {
  const params = await searchParams
  const [eventsResult, statsResult] = await Promise.all([
    getEvents({ search: params.search, status: params.status, scope: params.scope ?? 'all' }),
    getEventStats(),
  ])

  const events = eventsResult.data ?? []
  const stats = statsResult.data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Events</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{stats?.total ?? 0} total</Badge>
              <Badge variant="info">{stats?.upcoming ?? 0} upcoming</Badge>
              <Badge variant="success">{stats?.published ?? 0} published</Badge>
            </div>
          </div>
          <HelpButton
            title="Create an Event"
            content="To create an event, click 'Create Event' and fill in the event details. Events can be published to the portal for member registration. All event registrations automatically sync to the CRM."
            link="/dashboard/help/events/create-an-event"
          />
        </div>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <CalendarPlus className="h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      <EventFilters stats={stats} />

      <EventGrid events={events} />
    </div>
  )
}
