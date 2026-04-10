'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EventListItem } from '@/lib/types/event';

interface PortalEventCardProps {
  event: EventListItem;
}

export function PortalEventCard({ event }: PortalEventCardProps) {
  const isVirtual = event.format === 'VIRTUAL';
  return (
    <Link href={`/portal/events/${event.id}`} className="block rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{event.title}</h3>
        </div>
        <Badge>{isVirtual ? 'Online' : 'In person'}</Badge>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{new Date(event.startsAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</span>
        </div>
        {!isVirtual && event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{event.location}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
