'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiCall } from '@/lib/api';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { useApiToken } from '@/hooks/useMemberAuth';

interface PublicProfileProps {
  memberId: string;
}

interface PublicMemberProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  tier: string | null;
  clubsInCommon: string[];
  clubs: string[];
  eventsAttendedCount: number;
  publicFields: Array<{ label: string; value: string }>;
}

export function MemberPublicProfileCard({ memberId }: PublicProfileProps) {
  const { tenant } = useCurrentTenant();
  const { token } = useApiToken();

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-member-profile', tenant?.slug, memberId],
    queryFn: async () => {
      if (!tenant?.slug) return null;
      return apiCall<PublicMemberProfile>(`/portal/directory/${memberId}`, tenant.slug, token);
    },
    enabled: Boolean(tenant?.slug && memberId),
    staleTime: 30 * 1000,
  });

  const displayName = useMemo(() => {
    if (!data) return 'Member profile';
    return `${data.firstName} ${data.lastName}`;
  }, [data]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
        Loading member profile…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center text-destructive">
        Unable to load profile. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link href="/portal/directory" className="text-sm text-primary hover:underline">← Back to directory</Link>
          <h1 className="text-3xl font-semibold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">{data.tier ?? 'Member profile'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">Public profile</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr,0.7fr]">
        <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {data.avatarUrl ? (
                <AvatarImage src={data.avatarUrl} alt={displayName} />
              ) : (
                <AvatarFallback>{data.firstName.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{displayName}</p>
              <p className="text-sm text-muted-foreground">Member since 2023</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold">About</p>
            <p className="text-sm text-muted-foreground">{data.bio ?? 'This member has not added an about section yet.'}</p>
          </div>

          <div className="space-y-3">
            <p className="font-semibold">Clubs in common</p>
            <div className="flex flex-wrap gap-2">
              {data.clubsInCommon.length ? (
                data.clubsInCommon.map((club) => <Badge key={club}>{club}</Badge>)
              ) : (
                <p className="text-sm text-muted-foreground">No clubs in common yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold">Events attended</p>
            <p className="text-sm text-muted-foreground">{data.eventsAttendedCount} event registrations</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Public profile</h2>
            <p className="mt-2 text-sm text-muted-foreground">Only information shared publicly appears here.</p>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium">Location</p>
                <p>{data.location ?? 'Not shared'}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium">Member tier</p>
                <p>{data.tier ?? 'Not available'}</p>
              </div>
              {data.publicFields.map((field) => (
                <div key={field.label} className="rounded-2xl border border-border bg-background p-4">
                  <p className="font-medium">{field.label}</p>
                  <p>{field.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Connect</h2>
            <p className="mt-2 text-sm text-muted-foreground">Use the contact button to send a quick note to this member.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
