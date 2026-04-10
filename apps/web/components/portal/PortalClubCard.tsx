'use client';

import * as React from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ClubListItem } from '@/lib/types/club';

interface PortalClubCardProps {
  club: ClubListItem;
}

export function PortalClubCard({ club }: PortalClubCardProps) {
  return (
    <Link href={`/portal/clubs/${club.id}`} className="block rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{club.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{club.description ?? 'No description available.'}</p>
        </div>
        <Badge variant="outline">{club.visibility.toLowerCase()}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-4 w-4" /> {club._count.memberships}
        </span>
      </div>
    </Link>
  );
}
