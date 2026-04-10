'use client';

import * as React from 'react';
import { UserPlus, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { MemberListItem } from '@/lib/types/member';

interface DirectoryMemberCardProps {
  member: Pick<MemberListItem, 'id' | 'firstName' | 'lastName' | 'avatarUrl' | 'email'> & {
    tier?: string;
    clubs?: string[];
    isPublic?: boolean;
  };
}

export function DirectoryMemberCard({ member }: DirectoryMemberCardProps) {
  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          {member.avatarUrl ? (
            <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} />
          ) : (
            <AvatarFallback>{member.firstName.charAt(0)}</AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug">
            <Link href={`/portal/directory/${member.id}`} className="hover:underline">
              {member.firstName} {member.lastName}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">{member.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {member.tier && <Badge>{member.tier}</Badge>}
            {member.isPublic ? <Badge variant="secondary">Public</Badge> : <Badge variant="outline">Private</Badge>}
          </div>
        </div>
      </div>
      {member.clubs?.length ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {member.clubs.slice(0, 3).map((club) => (
            <span key={club} className="rounded-full border px-2 py-1">{club}</span>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/portal/directory/${member.id}`}>View profile</Link>
        </Button>
        <Button variant="ghost" size="sm" className="gap-1">
          <MessageCircle className="h-4 w-4" /> Message
        </Button>
      </div>
    </article>
  );
}
