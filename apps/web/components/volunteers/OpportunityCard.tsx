'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin, Video, Clock, Users, Calendar, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { VolunteerOpportunityListItem, VolunteerLocation, VolunteerCategory } from '@/lib/types/volunteer';

function parseLocation(raw: string | null): VolunteerLocation | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as VolunteerLocation; } catch { return null; }
}

const CATEGORY_LABELS: Record<VolunteerCategory, string> = {
  FUNDRAISING: 'Fundraising',
  EVENTS: 'Events',
  ADMIN: 'Admin',
  OUTREACH: 'Outreach',
  EDUCATION: 'Education',
  OTHER: 'Other',
};

const CATEGORY_COLORS: Record<VolunteerCategory, string> = {
  FUNDRAISING: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  EVENTS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  OUTREACH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  EDUCATION: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400',
};

interface OpportunityCardProps {
  opportunity: VolunteerOpportunityListItem;
  href?: string;
  category?: VolunteerCategory;
  className?: string;
}

export function OpportunityCard({ opportunity, href, category, className }: OpportunityCardProps) {
  const location = parseLocation(opportunity.location);

  const cardContent = (
    <Card className={cn('overflow-hidden transition-shadow hover:shadow-md h-full flex flex-col', className)}>
      {/* Header Banner */}
      <div
        className="flex h-28 items-center justify-center relative"
        style={{ background: 'hsl(var(--muted))' }}
      >
        <span className="text-4xl font-bold text-muted-foreground/30 uppercase">
          {opportunity.title.charAt(0)}
        </span>
        <div className="absolute right-2 top-2 flex gap-1.5">
          {category && (
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', CATEGORY_COLORS[category])}>
              {CATEGORY_LABELS[category]}
            </span>
          )}
          {!opportunity.isActive && (
            <Badge variant="secondary" className="text-xs">Closed</Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 flex-1">
        <h3 className="line-clamp-2 font-semibold leading-snug">{opportunity.title}</h3>
        {opportunity.description && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{opportunity.description}</p>
        )}

        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          {opportunity.startsAt && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{format(new Date(opportunity.startsAt), 'MMM d, yyyy')}</span>
            </div>
          )}
          {opportunity.isVirtual ? (
            <div className="flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 shrink-0" />
              <span>Virtual</span>
            </div>
          ) : location?.city ? (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{[location.name, location.city].filter(Boolean).join(', ')}</span>
            </div>
          ) : null}
          {opportunity.totalHours != null && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{opportunity.totalHours}h total</span>
            </div>
          )}
        </div>

        {opportunity.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {opportunity.skills.slice(0, 3).map((skill) => (
              <Badge key={skill.id} variant={skill.isRequired ? 'default' : 'secondary'} className="text-xs">
                {skill.name}
              </Badge>
            ))}
            {opportunity.skills.length > 3 && (
              <Badge variant="outline" className="text-xs">+{opportunity.skills.length - 3} more</Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{opportunity._count.applications} applications</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-primary">
          <span>Learn more</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </CardFooter>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block h-full">{cardContent}</Link>;
  }
  return cardContent;
}
