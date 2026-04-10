import * as React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, MapPin, Video, Users, ArrowLeft, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { apiCall } from '@/lib/api';
import type { EventDetail, EventLocation } from '@/lib/types/event';

function parseLocation(raw: string | null): EventLocation | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as EventLocation; } catch { return null; }
}

interface Props {
  params: Promise<{ tenantSlug: string; eventId: string }>;
}

export default async function PublicEventDetailPage({ params }: Props) {
  const { tenantSlug, eventId } = await params;

  let event: EventDetail;
  try {
    event = await apiCall<EventDetail>(`/events/${eventId}`, tenantSlug, null);
  } catch {
    notFound();
  }

  if (event.status !== 'PUBLISHED' || !event.isPublic) {
    notFound();
  }

  const location = parseLocation(event.location);
  const isFull = Boolean(
    event.capacity && event._count.registrations >= event.capacity,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/${tenantSlug}/events`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Events
      </Link>

      {/* Cover */}
      {event.coverImageUrl && (
        <div className="mb-8 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.coverImageUrl} alt={event.title} className="h-64 w-full object-cover" />
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        {/* Main */}
        <div className="space-y-6">
          {event.category && (
            <Badge variant="outline">{event.category.name}</Badge>
          )}
          <h1 className="text-3xl font-bold leading-tight">{event.title}</h1>

          {event.description && (
            <div
              className="prose prose-sm max-w-none text-muted-foreground"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          )}

          {event.speakers.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="mb-4 font-semibold text-lg">Speakers</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {event.speakers.map((speaker) => (
                    <div key={speaker.id} className="flex gap-3">
                      {speaker.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={speaker.photoUrl}
                          alt={speaker.name}
                          className="h-12 w-12 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted font-bold shrink-0">
                          {speaker.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{speaker.name}</p>
                        {speaker.title && (
                          <p className="text-xs text-muted-foreground">{speaker.title}</p>
                        )}
                        {speaker.topic && (
                          <p className="text-xs italic text-muted-foreground">{speaker.topic}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {event.sponsors.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="mb-4 font-semibold text-lg">Sponsors</h2>
                <div className="flex flex-wrap gap-3">
                  {event.sponsors.map((s) => (
                    <div key={s.id} className="rounded-lg border px-4 py-2 text-sm font-medium">
                      {s.name}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{format(new Date(event.startsAt), 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-muted-foreground">{format(new Date(event.startsAt), 'h:mm a')}</p>
                </div>
              </div>
              {event.endsAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Ends {format(new Date(event.endsAt), 'h:mm a')}</span>
                </div>
              )}
              {event.format !== 'VIRTUAL' && location && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    {location.name && <p>{location.name}</p>}
                    {location.address && <p>{location.address}</p>}
                    {location.city && <p>{[location.city, location.state].filter(Boolean).join(', ')}</p>}
                  </div>
                </div>
              )}
              {event.format !== 'IN_PERSON' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Video className="h-4 w-4 shrink-0" />
                  <span>Online Event</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  {event._count.registrations} registered
                  {event.capacity && ` of ${event.capacity}`}
                </span>
              </div>
            </div>

            <Separator />

            {event.tickets.length > 0 && (
              <div className="space-y-2">
                {event.tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span>{t.name}</span>
                    <span className="font-semibold">
                      {t.price === 0 ? 'Free' : `$${(t.price / 100).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isFull ? (
              <Button className="w-full" disabled>
                Sold Out
              </Button>
            ) : (
              <Button className="w-full" asChild>
                <Link href={`/${tenantSlug}/events/${eventId}/register`}>
                  Register Now
                </Link>
              </Button>
            )}

            {event.isMembersOnly && (
              <p className="text-center text-xs text-muted-foreground">Members only event</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
