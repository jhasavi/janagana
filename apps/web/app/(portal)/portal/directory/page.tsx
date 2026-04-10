'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DirectoryMemberCard } from '@/components/portal/DirectoryMemberCard';
import { Badge } from '@/components/ui/badge';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { useApiToken } from '@/hooks/useMemberAuth';
import { apiCall } from '@/lib/api';

interface DirectoryMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  tier?: string | null;
  clubs: string[];
  isPublic: boolean;
}

const defaultTiers = ['All'];
const defaultClubs = ['All'];

export default function DirectoryPage() {
  const { tenant } = useCurrentTenant();
  const { token } = useApiToken();
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState('All');
  const [selectedClub, setSelectedClub] = useState('All');

  const { data, isLoading } = useQuery({
    queryKey: ['portal-directory', tenant?.slug, search],
    queryFn: async () => {
      if (!tenant?.slug) return { data: [] as DirectoryMember[] };
      return apiCall<{ data: DirectoryMember[] }>('/portal/directory', tenant.slug, token, {
        params: { search: search || undefined },
      });
    },
    enabled: Boolean(tenant?.slug),
    staleTime: 20 * 1000,
  });

  const members = data?.data ?? [];
  const uniqueTierNames = useMemo(() => {
    const tiers = Array.from(new Set(members.map((member) => member.tier).filter(Boolean)));
    return ['All', ...tiers] as string[];
  }, [members]);
  const uniqueClubNames = useMemo(() => {
    const clubs = Array.from(new Set(members.flatMap((member) => member.clubs)));
    return ['All', ...clubs] as string[];
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = [member.firstName, member.lastName, member.email].some((field) =>
        field.toLowerCase().includes(search.toLowerCase()),
      );
      const matchesTier = selectedTier === 'All' || member.tier === selectedTier;
      const matchesClub = selectedClub === 'All' || member.clubs.includes(selectedClub);
      return matchesSearch && matchesTier && matchesClub && member.isPublic;
    });
  }, [members, search, selectedTier, selectedClub]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Member Directory</h1>
          <p className="mt-2 text-sm text-muted-foreground">Search for members who have made their profile public.</p>
        </div>
        <Badge variant="outline">Public profiles only</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.5fr,1fr,1fr]">
        <Input
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={selectedTier} onValueChange={setSelectedTier}>
          <SelectTrigger>
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            {uniqueTierNames.map((tier) => (
              <SelectItem key={tier} value={tier}>{tier}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedClub} onValueChange={setSelectedClub}>
          <SelectTrigger>
            <SelectValue placeholder="Club" />
          </SelectTrigger>
          <SelectContent>
            {uniqueClubNames.map((club) => (
              <SelectItem key={club} value={club}>{club}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
          Loading members…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
          No public members match your filters.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((member) => (
            <DirectoryMemberCard key={member.id} member={member} />
          ))}
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <p className="font-medium">Note:</p>
        <p>Only members who enabled public visibility appear here. If you can’t find someone, ask them to update their privacy settings on their profile page.</p>
      </div>
    </div>
  );
}
