import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, MapPin, Video, Clock } from 'lucide-react';
import { requireMember } from '@/lib/auth';
import { apiCall } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import type { EventListItem, EventLocation } from '@/lib/types/event';

function parseLocation(raw: string | null): EventLocation | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as EventLocation; } catch { return null; }
}

export default async function PortalEventsPage() {
  const member = await requireMember();
  const tenantId = member.tenantId!;

  let events: EventListItem[] = [];
  try {
    events = await apiCall<EventListItem[]>(
      `/events/public/${tenantId}`,
      tenantId,
      null,
    );
  } catch {
    // if fetch fails, show empty state
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upcoming Events</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse and register for upcoming events.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Calendar className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No upcoming events.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const location = parseLocation(event.location);
            const isFull = Boolean(
              event.capacity && event._count.registrations >= event.capacity,
            );

            return (
              <Link
                key={event.id}
                href={`/portal/events/${event.id}`}
                className="block rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
              >
                {event.coverImageUrl && (
                  <div className="mb-3 overflow-hidden rounded-lg h-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.coverImageUrl}
                      alt={event.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <h3 className="font-semibold text-sm line-clamp-2">{event.title}</h3>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{format(new Date(event.startsAt), 'MMM d, yyyy · h:mm a')}</span>
                  </div>
                  {event.format !== 'VIRTUAL' && location?.city && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{location.city}</span>
                    </div>
                  )}
                  {event.format === 'VIRTUAL' && (
                    <div className="flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 shrink-0" />
                      <span>Online</span>
                    </div>
                  )}
                </div>
                {isFull && (
                  <Badge variant="warning" className="mt-2 text-xs">
                    Sold Out
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <div className="text-center">
        <Link
          href="/portal/events/my-registrations"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          View my registrations →
        </Link>
      </div>
    </div>
  );
}
