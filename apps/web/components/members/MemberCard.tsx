'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MemberAvatar } from './MemberAvatar';
import { MemberStatusBadge } from './MemberStatusBadge';
import { MemberTierBadge } from './MemberTierBadge';
import { cn } from '@/lib/utils';
import type { MemberListItem } from '@/lib/types/member';

interface MemberCardProps {
  member: MemberListItem;
  className?: string;
}

export function MemberCard({ member, className }: MemberCardProps) {
  const activeSub = member.membershipSubscriptions[0];
  const fullName = `${member.firstName} ${member.lastName}`;

  return (
    <Link href={`/dashboard/members/${member.id}`}>
      <Card className={cn('cursor-pointer transition-shadow hover:shadow-md', className)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <MemberAvatar
              firstName={member.firstName}
              lastName={member.lastName}
              avatarUrl={member.avatarUrl}
              status={member.status}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-sm">{fullName}</p>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
              {member.phone && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{member.phone}</span>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <MemberStatusBadge status={member.status} />
                <MemberTierBadge tierName={activeSub?.tier?.name} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
