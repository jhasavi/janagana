export const revalidate = 300;

import * as React from 'react';
import { notFound } from 'next/navigation';
import { Calendar, MapPin, Video } from 'lucide-react';
import { format } from 'date-fns';
import { apiCall } from '@/lib/api';
import { EventPublicCard } from '@/components/events/EventCard';
import type { EventListItem } from '@/lib/types/event';

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ search?: string; format?: string }>;
}

export default async function PublicEventsPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const sp = await searchParams;

  let events: EventListItem[] = [];
  try {
    events = await apiCall<EventListItem[]>(
      `/events/public/${tenantSlug}`,
      tenantSlug,
      null,
      { params: { search: sp.search, format: sp.format } },
    );
  } catch {
    // If tenant not found → 404 
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Upcoming Events</h1>
        <p className="mt-2 text-muted-foreground">
          Browse and register for our upcoming events.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold">No upcoming events</h2>
          <p className="text-sm text-muted-foreground">Check back soon for new events.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventPublicCard
              key={event.id}
              event={event}
              href={`/${tenantSlug}/events/${event.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
