'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Users, LayoutGrid, List, Globe, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { ClubCard } from '@/components/clubs/ClubCard';

import { useClubStats, useClubs } from '@/hooks/useClubs';
import type { ClubVisibility } from '@/lib/types/club';

const VISIBILITY_OPTIONS: { value: '' | ClubVisibility; label: string }[] = [
  { value: '', label: 'All Visibility' },
  { value: 'PUBLIC', label: 'Public' },
  { value: 'PRIVATE', label: 'Private' },
  { value: 'INVITE_ONLY', label: 'Invite Only' },
];

export default function ClubsDashboardPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState<'' | ClubVisibility>('');
  const [onlyActive, setOnlyActive] = useState(false);

  const { data: stats, isLoading: statsLoading } = useClubStats();
  const { data: clubsData, isLoading: clubsLoading } = useClubs({
    search: search || undefined,
    isActive: onlyActive ? true : undefined,
    page: 1,
    limit: 50,
  });

  const clubs = (clubsData?.data ?? []).filter((c) =>
    visibility ? c.visibility === visibility : true,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clubs"
        description="Manage your organisation's clubs and sub-groups."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clubs' }]}
        actions={
          <Link href="/dashboard/clubs/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Club
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <StatsCard
              title="Total Clubs"
              value={stats?.totalClubs ?? 0}
              icon={Users}
            />
            <StatsCard
              title="Active Clubs"
              value={stats?.activeClubs ?? 0}
              icon={Globe}
            />
            <StatsCard
              title="Total Members"
              value={stats?.totalMembers ?? 0}
              icon={Users}
            />
            <StatsCard
              title="Posts This Month"
              value={stats?.postsThisMonth ?? 0}
              icon={MessageSquare}
            />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search clubs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-64"
        />
        <Select
          value={visibility}
          onValueChange={(v) => setVisibility(v as '' | ClubVisibility)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value || '__all__'}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={onlyActive ? 'default' : 'outline'}
          size="sm"
          onClick={() => setOnlyActive((v) => !v)}
        >
          {onlyActive ? 'Active only' : 'All statuses'}
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={view === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView('list')}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Club grid / list */}
      {clubsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No clubs found. Create one to get started.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              href={`/dashboard/clubs/${club.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {clubs.map((club) => (
            <Link
              key={club.id}
              href={`/dashboard/clubs/${club.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{club.name}</p>
                {club.description && (
                  <p className="text-xs text-muted-foreground truncate">{club.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                <span>{club._count.memberships} members</span>
                <Badge variant={club.isActive ? 'default' : 'secondary'}>
                  {club.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
