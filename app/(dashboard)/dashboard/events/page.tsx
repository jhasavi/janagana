import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'
import { getEvents, getEventStats } from '@/lib/actions/events'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EventGrid } from './_components/event-grid'
import { EventFilters } from './_components/event-filters'

export const metadata: Metadata = { title: 'Events' }

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const params = await searchParams
  const [eventsResult, statsResult] = await Promise.all([
    getEvents({ search: params.search, status: params.status }),
    getEventStats(),
  ])

  const events = eventsResult.data ?? []
  const stats = statsResult.data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{stats?.total ?? 0} total</Badge>
            <Badge variant="info">{stats?.upcoming ?? 0} upcoming</Badge>
            <Badge variant="success">{stats?.published ?? 0} published</Badge>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <CalendarPlus className="h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      <EventFilters />

      <EventGrid events={events} />
    </div>
  )
}
