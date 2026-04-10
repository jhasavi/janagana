'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Clock, Users, CreditCard, FileText, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MemberActivity } from '@/lib/types/member';

interface MemberActivityFeedProps {
  activity: MemberActivity | undefined;
  isLoading?: boolean;
  className?: string;
}

interface FeedItem {
  id: string;
  date: string;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle?: string;
}

function buildFeed(activity: MemberActivity): FeedItem[] {
  const items: FeedItem[] = [];

  for (const e of activity.eventRegistrations) {
    items.push({
      id: `event-${e.id}`,
      date: e.registeredAt,
      icon: Calendar,
      iconColor: 'text-blue-500',
      title: `Registered for ${e.event?.title ?? 'an event'}`,
      subtitle: e.status,
    });
  }
  for (const h of activity.volunteerHours) {
    items.push({
      id: `vol-${h.id}`,
      date: h.date,
      icon: Clock,
      iconColor: 'text-green-500',
      title: `Logged ${h.hours}h volunteer time`,
      subtitle: h.description ?? undefined,
    });
  }
  for (const c of activity.clubMemberships) {
    items.push({
      id: `club-${c.id}`,
      date: c.joinedAt,
      icon: Users,
      iconColor: 'text-purple-500',
      title: `Joined ${c.club?.name ?? 'a club'}`,
      subtitle: c.role,
    });
  }
  for (const p of activity.payments) {
    items.push({
      id: `pay-${p.id}`,
      date: p.createdAt,
      icon: CreditCard,
      iconColor: 'text-orange-500',
      title: `Payment of $${(p.amountCents / 100).toFixed(2)}`,
      subtitle: p.status,
    });
  }
  for (const n of activity.notes) {
    if (!n.isPrivate) {
      items.push({
        id: `note-${n.id}`,
        date: n.createdAt,
        icon: n.isPrivate ? FileText : MessageSquare,
        iconColor: 'text-gray-500',
        title: `Note added by ${n.author?.fullName ?? 'staff'}`,
        subtitle: n.body.slice(0, 80) + (n.body.length > 80 ? '…' : ''),
      });
    }
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function MemberActivityFeed({ activity, isLoading, className }: MemberActivityFeedProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activity) return null;

  const feed = buildFeed(activity);

  if (feed.length === 0) {
    return (
      <div className={cn('py-8 text-center text-sm text-muted-foreground', className)}>
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {feed.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-muted', item.iconColor)}>
                <Icon className="h-4 w-4" />
              </div>
              {i < feed.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-4 min-w-0">
              <p className="text-sm font-medium leading-tight">{item.title}</p>
              {item.subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground capitalize">{item.subtitle}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
