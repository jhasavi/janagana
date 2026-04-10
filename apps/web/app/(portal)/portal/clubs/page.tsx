'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Users, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ClubCard } from '@/components/clubs/ClubCard';

import { useClubs, useJoinClub, useMyClubMembership } from '@/hooks/useClubs';
import type { ClubListItem } from '@/lib/types/club';

// The portal expects the member to supply their memberId.
// In a real implementation this would come from a session/context provider.
// Here we accept it via a prop-compatible URL query param pattern.
const MEMBER_ID_KEY = 'portalMemberId';

function getMemberId() {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(MEMBER_ID_KEY) ?? '';
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'INTEREST', label: 'Interest' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'OTHER', label: 'Other' },
];

export default function PortalClubsPage() {
  const memberId = getMemberId();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const { data: allClubs, isLoading } = useClubs({ page: 1, limit: 100 });
  const { data: myClubs } = useClubs({ myClubs: true, page: 1, limit: 100 });

  const clubs = (allClubs?.data ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q);
  });

  const myClubIds = new Set((myClubs?.data ?? []).map((c) => c.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Clubs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Discover clubs, connect with other members, and get involved.
        </p>
      </div>

      {/* My Clubs */}
      {(myClubs?.data ?? []).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold">My Clubs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(myClubs?.data ?? []).map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                href={`/portal/clubs/${club.id}`}
                isMember
              />
            ))}
          </div>
          <Separator />
        </section>
      )}

      {/* Discover */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Discover Clubs</h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clubs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value || '__all__'} value={o.value || '__all__'}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No clubs found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubs.map((club) => (
              <ClubCardWithJoin
                key={club.id}
                club={club}
                memberId={memberId}
                isMember={myClubIds.has(club.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ClubCardWithJoin({
  club,
  memberId,
  isMember,
}: {
  club: ClubListItem;
  memberId: string;
  isMember: boolean;
}) {
  const joinClub = useJoinClub(club.id);

  const handleJoin = () => {
    if (!memberId) { toast.error('Member ID not found. Please contact your administrator.'); return; }
    joinClub.mutate(memberId, {
      onSuccess: () => toast.success(`Joined ${club.name}!`),
      onError: () => toast.error('Failed to join club'),
    });
  };

  return (
    <ClubCard
      club={club}
      href={`/portal/clubs/${club.id}`}
      isMember={isMember}
      onJoin={handleJoin}
      joinPending={joinClub.isPending}
    />
  );
}
