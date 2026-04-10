'use client';

import * as React from 'react';
import { Globe, Lock, Users, FileText, Calendar, Settings } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClubDetail, ClubMembershipItem, ClubVisibility, ClubRoleType } from '@/lib/types/club';

const ROLE_LABELS: Record<ClubRoleType, string> = {
  LEADER: 'Leader',
  CO_LEADER: 'Co-Leader',
  MEMBER: 'Member',
};

const ROLE_VARIANTS: Record<ClubRoleType, 'default' | 'secondary' | 'outline'> = {
  LEADER: 'default',
  CO_LEADER: 'secondary',
  MEMBER: 'outline',
};

interface ClubHeaderProps {
  club: ClubDetail;
  myMembership?: ClubMembershipItem | null;
  memberCount: number;
  postCount: number;
  eventCount?: number;
  onJoin?: () => void;
  onLeave?: () => void;
  joinPending?: boolean;
  leavePending?: boolean;
  showAdminLinks?: boolean;
  editHref?: string;
}

export function ClubHeader({
  club,
  myMembership,
  memberCount,
  postCount,
  eventCount = 0,
  onJoin,
  onLeave,
  joinPending,
  leavePending,
  showAdminLinks,
  editHref,
}: ClubHeaderProps) {
  const isLeader =
    myMembership?.role === 'LEADER' || myMembership?.role === 'CO_LEADER';

  return (
    <div className="space-y-0 overflow-hidden rounded-xl border bg-card">
      {/* Cover image */}
      <div className="relative h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        {club.coverImageUrl ? (
          <img
            src={club.coverImageUrl}
            alt={club.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Info row */}
      <div className="px-5 pb-5 pt-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{club.name}</h1>
              {!club.isActive && <Badge variant="secondary">Inactive</Badge>}
              <VisibilityBadge visibility={club.visibility} />
              {myMembership && (
                <Badge variant={ROLE_VARIANTS[myMembership.role]}>
                  {ROLE_LABELS[myMembership.role]}
                </Badge>
              )}
            </div>
            {club.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(isLeader || showAdminLinks) && editHref && (
              <Link href={editHref}>
                <Button variant="outline" size="sm">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Settings
                </Button>
              </Link>
            )}
            {!myMembership && onJoin && (
              <Button size="sm" onClick={onJoin} disabled={joinPending}>
                {joinPending ? 'Joining…' : club.visibility === 'INVITE_ONLY' ? 'Request to Join' : 'Join Club'}
              </Button>
            )}
            {myMembership && myMembership.role !== 'LEADER' && onLeave && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/50 hover:bg-destructive/5"
                onClick={onLeave}
                disabled={leavePending}
              >
                {leavePending ? 'Leaving…' : 'Leave Club'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-5 text-sm text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <strong className="text-foreground font-semibold">{memberCount}</strong> members
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <strong className="text-foreground font-semibold">{postCount}</strong> posts
          </span>
          {eventCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <strong className="text-foreground font-semibold">{eventCount}</strong> events
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: ClubVisibility }) {
  if (visibility === 'PUBLIC') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
        <Globe className="h-3 w-3" /> Public
      </span>
    );
  }
  if (visibility === 'INVITE_ONLY') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
        <Lock className="h-3 w-3" /> Invite Only
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Lock className="h-3 w-3" /> Private
    </span>
  );
}
