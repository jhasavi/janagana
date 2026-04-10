'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MemberTierBadgeProps {
  tierName?: string | null;
  isFree?: boolean;
  className?: string;
}

export function MemberTierBadge({ tierName, isFree, className }: MemberTierBadgeProps) {
  if (!tierName) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        No Tier
      </Badge>
    );
  }
  return (
    <Badge variant={isFree ? 'secondary' : 'default'} className={cn(className)}>
      {tierName}
    </Badge>
  );
}
