import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, MapPin, Video, Users, Clock, ArrowLeft } from 'lucide-react';
import { requireMember } from '@/lib/auth';
import { apiCall } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { EventDetail, EventLocation } from '@/lib/types/event';

function parseLocation(raw: string | null): EventLocation | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as EventLocation; } catch { return null; }
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PortalEventDetailPage({ params }: Props) {
  const { id } = await params;
  const member = await requireMember();
  const tenantId = member.tenantId!;

  let event: EventDetail;
  try {
    event = await apiCall<EventDetail>(`/events/${id}`, tenantId, null);
  } catch {
    notFound();
  }

  if (event.status !== 'PUBLISHED') notFound();

  const location = parseLocation(event.location);
  const isFull = Boolean(
    event.capacity && event._count.registrations >= event.capacity,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/portal/events"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Events
      </Link>

      {event.coverImageUrl && (
        <div className="overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.coverImageUrl} alt={event.title} className="h-56 w-full object-cover" />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Main */}
        <div className="space-y-5">
          {event.category && (
            <Badge variant="outline">{event.category.name}</Badge>
          )}
          <h1 className="text-2xl font-bold">{event.title}</h1>
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
              <h2 className="font-semibold">Speakers</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {event.speakers.map((s) => (
                  <div key={s.id} className="flex gap-3">
                    {s.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photoUrl} alt={s.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold shrink-0">
                        {s.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      {s.title && <p className="text-xs text-muted-foreground">{s.title}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="rounded-xl border bg-card p-5 space-y-4 h-fit">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">{format(new Date(event.startsAt), 'EEEE, MMMM d')}</p>
                <p className="text-muted-foreground">{format(new Date(event.startsAt), 'h:mm a')}</p>
              </div>
            </div>
            {event.endsAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Until {format(new Date(event.endsAt), 'h:mm a')}</span>
              </div>
            )}
            {event.format !== 'VIRTUAL' && location?.city && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  {location.name && <p>{location.name}</p>}
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

          {event.tickets.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                {event.tickets.map((t) => (
                  <div key={t.id} className="flex justify-between text-sm">
                    <span>{t.name}</span>
                    <span className="font-semibold">
                      {t.price === 0 ? 'Free' : `$${(t.price / 100).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {isFull ? (
            <Button className="w-full" disabled>Sold Out</Button>
          ) : (
            <form
              action={`/portal/events/${id}/register`}
              method="GET"
            >
              <Button type="submit" className="w-full">Register</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
