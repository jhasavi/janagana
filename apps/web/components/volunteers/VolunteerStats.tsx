'use client';

import * as React from 'react';
import { Clock, Users, HandHeart, FileCheck } from 'lucide-react';
import { StatsCard } from '@/components/common/StatsCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { VolunteerStats } from '@/lib/types/volunteer';

interface VolunteerStatsProps {
  stats: VolunteerStats | undefined;
  isLoading?: boolean;
}

export function VolunteerStatsBar({ stats, isLoading }: VolunteerStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Active Opportunities"
        value={stats?.activeOpportunities ?? 0}
        icon={HandHeart}
      />
      <StatsCard
        title="Total Volunteers"
        value={stats?.totalVolunteers ?? 0}
        icon={Users}
      />
      <StatsCard
        title="Hours This Month"
        value={stats?.totalHoursLogged ?? 0}
        icon={Clock}
      />
      <StatsCard
        title="Pending Applications"
        value={stats?.pendingApplications ?? 0}
        icon={FileCheck}
      />
    </div>
  );
}
