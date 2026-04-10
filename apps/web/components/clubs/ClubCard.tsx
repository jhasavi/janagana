'use client';

import * as React from 'react';
import Link from 'next/link';
import { Users, Globe, Lock, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClubListItem, ClubVisibility } from '@/lib/types/club';

const VISIBILITY_LABELS: Record<ClubVisibility, string> = {
  PUBLIC: 'Public',
  PRIVATE: 'Private',
  INVITE_ONLY: 'Invite Only',
};

const VISIBILITY_COLORS: Record<ClubVisibility, string> = {
  PUBLIC: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PRIVATE: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400',
  INVITE_ONLY: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

interface ClubCardProps {
  club: ClubListItem;
  href?: string;
  isMember?: boolean;
  onJoin?: () => void;
  joinPending?: boolean;
  className?: string;
}

export function ClubCard({ club, href, isMember, onJoin, joinPending, className }: ClubCardProps) {
  const inner = (
    <Card className={cn('overflow-hidden transition-shadow hover:shadow-md h-full flex flex-col', className)}>
      {/* Cover */}
      <div className="relative h-28 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
        {club.coverImageUrl ? (
          <img src={club.coverImageUrl} alt={club.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Users className="h-12 w-12 text-primary/30" />
        )}
        <div className="absolute top-2 right-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', VISIBILITY_COLORS[club.visibility])}>
            {club.visibility === 'PUBLIC' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {VISIBILITY_LABELS[club.visibility]}
          </span>
        </div>
        {!club.isActive && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <Badge variant="secondary">Inactive</Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 flex-1 space-y-2">
        <h3 className="font-semibold text-base leading-tight line-clamp-1">{club.name}</h3>
        {club.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
        )}
        <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {club._count.memberships} member{club._count.memberships !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {club._count.posts} post{club._count.posts !== 1 ? 's' : ''}
          </span>
        </div>
      </CardContent>

      {onJoin && (
        <CardFooter className="px-4 pb-4 pt-0">
          {isMember ? (
            <Badge variant="secondary" className="w-full justify-center py-1">Member</Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={(e) => { e.preventDefault(); onJoin(); }}
              disabled={joinPending}
            >
              {joinPending ? 'Joining…' : club.visibility === 'INVITE_ONLY' ? 'Request to Join' : 'Join Club'}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );

  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}
