'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, MapPin, Video, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EventStatusBadge } from './EventStatusBadge';
import { cn } from '@/lib/utils';
import type { EventListItem, EventLocation } from '@/lib/types/event';

function parseLocation(raw: string | null): EventLocation | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as EventLocation; } catch { return null; }
}

interface EventCardProps {
  event: EventListItem;
  href?: string;
  className?: string;
}

export function EventCard({ event, href, className }: EventCardProps) {
  const location = parseLocation(event.location);
  const registrationPct =
    event.capacity && event._count.registrations > 0
      ? Math.min(100, Math.round((event._count.registrations / event.capacity) * 100))
      : null;

  const cardContent = (
    <Card className={cn('overflow-hidden transition-shadow hover:shadow-md', className)}>
      {event.coverImageUrl ? (
        <div className="relative h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute right-2 top-2">
            <EventStatusBadge status={event.status} />
          </div>
        </div>
      ) : (
        <div
          className="relative flex h-36 items-center justify-center"
          style={{ background: event.category?.color ?? 'hsl(var(--muted))' }}
        >
          <span className="text-3xl font-bold text-white/80">{event.title.charAt(0)}</span>
          <div className="absolute right-2 top-2">
            <EventStatusBadge status={event.status} />
          </div>
        </div>
      )}

      <CardContent className="p-4">
        {event.category && (
          <p className="mb-1 text-xs font-medium text-muted-foreground">{event.category.name}</p>
        )}
        <h3 className="line-clamp-2 font-semibold leading-snug">{event.title}</h3>

        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{format(new Date(event.startsAt), 'MMM d, yyyy • h:mm a')}</span>
          </div>
          {event.format === 'IN_PERSON' && location?.city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {[location.name, location.city].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {event.format === 'VIRTUAL' && (
            <div className="flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 shrink-0" />
              <span>Virtual Event</span>
            </div>
          )}
          {event.format === 'HYBRID' && (
            <div className="flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 shrink-0" />
              <span>Hybrid</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t p-4 pt-3">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              {event._count.registrations}
              {event.capacity ? ` / ${event.capacity}` : ''} registered
            </span>
          </div>
          {registrationPct !== null && (
            <div className="w-20">
              <Progress value={registrationPct} className="h-1.5" />
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }
  return cardContent;
}

// ─── Public-facing card (for public pages) ────────────────────────────────────

interface EventPublicCardProps {
  event: EventListItem;
  href?: string;
  primaryColor?: string;
}

export function EventPublicCard({ event, href, primaryColor }: EventPublicCardProps) {
  const location = parseLocation(event.location);
  const isFull = Boolean(
    event.capacity && event._count.registrations >= event.capacity,
  );

  const content = (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      {event.coverImageUrl ? (
        <div className="h-44 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      ) : (
        <div
          className="flex h-44 items-center justify-center"
          style={{ backgroundColor: primaryColor ?? event.category?.color ?? '#e5e7eb' }}
        >
          <span className="text-4xl font-black text-white/70">{event.title.charAt(0)}</span>
        </div>
      )}

      <CardContent className="p-5">
        {event.category && (
          <Badge variant="outline" className="mb-2 text-xs">
            {event.category.name}
          </Badge>
        )}
        <h3 className="line-clamp-2 text-lg font-bold leading-snug">{event.title}</h3>

        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{format(new Date(event.startsAt), 'EEEE, MMM d, yyyy • h:mm a')}</span>
          </div>
          {event.format !== 'VIRTUAL' && location?.city && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{[location.name, location.city].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {event.format === 'VIRTUAL' && (
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 shrink-0" />
              <span>Online Event</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          {isFull ? (
            <Badge variant="warning">Sold Out</Badge>
          ) : (
            <span className="text-sm font-semibold" style={{ color: primaryColor }}>
              {event._count.tickets === 0 ? 'Free' : 'Register'}
            </span>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
