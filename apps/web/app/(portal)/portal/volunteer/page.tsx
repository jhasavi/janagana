'use client';

import * as React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { HandHeart, MapPin, Video, Clock, Calendar, Filter } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/common/SearchInput';
import { OpportunityCard } from '@/components/volunteers/OpportunityCard';

import { usePublicOpportunities, useVolunteerStats } from '@/hooks/useVolunteers';
import type { VolunteerCategory } from '@/lib/types/volunteer';

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'FUNDRAISING', label: 'Fundraising' },
  { value: 'EVENTS', label: 'Events' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OUTREACH', label: 'Outreach' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'OTHER', label: 'Other' },
];

export default function PortalVolunteerPage() {
  const [search, setSearch] = useState('');

  const { data: opportunities, isLoading } = usePublicOpportunities({ isActive: true });
  const { data: stats } = useVolunteerStats();

  const filtered = (opportunities ?? []).filter((opp) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return opp.title.toLowerCase().includes(q) || (opp.description ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Volunteer Opportunities</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Make a difference — find an opportunity that fits your schedule and skills.
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-1.5 rounded-full border bg-primary/5 px-4 py-2 shrink-0">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{stats.totalHoursLogged}h</span>
            <span className="text-xs text-muted-foreground">total volunteered</span>
          </div>
        )}
      </div>

      {/* Quick Action */}
      <div className="rounded-xl border bg-primary/5 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <HandHeart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Track your volunteer journey</p>
            <p className="text-sm text-muted-foreground">View your applications, shifts, and hours.</p>
          </div>
        </div>
        <Link href="/portal/volunteer/my-activity">
          <Button variant="outline">My Activity</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search opportunities..."
          className="w-64"
        />
      </div>

      {/* Opportunities Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <HandHeart className="h-12 w-12 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No volunteer opportunities available right now.</p>
          <p className="text-sm text-muted-foreground">Check back soon for new opportunities!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              href={`/portal/volunteer/opportunities/${opp.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
