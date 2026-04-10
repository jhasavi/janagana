'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { MemberStatus } from '@/lib/types/member';

const statusDotClass: Record<MemberStatus, string> = {
  ACTIVE: 'bg-green-500',
  INACTIVE: 'bg-gray-400',
  PENDING: 'bg-yellow-500',
  BANNED: 'bg-red-500',
};

interface MemberAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  status?: MemberStatus;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
}

const sizeClass = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base' };
const dotSize = { sm: 'h-2 w-2', md: 'h-2.5 w-2.5', lg: 'h-3 w-3' };

export function MemberAvatar({
  firstName,
  lastName,
  avatarUrl,
  status,
  size = 'md',
  showStatus = true,
  className,
}: MemberAvatarProps) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <Avatar className={sizeClass[size]}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={`${firstName} ${lastName}`} />}
        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showStatus && status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-background',
            dotSize[size],
            statusDotClass[status],
          )}
          title={status.charAt(0) + status.slice(1).toLowerCase()}
        />
      )}
    </div>
  );
}
