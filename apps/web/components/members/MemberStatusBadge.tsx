'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { MemberStatus } from '@/lib/types/member';

const config: Record<MemberStatus, { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  INACTIVE: { label: 'Inactive', variant: 'secondary' },
  PENDING: { label: 'Pending', variant: 'warning' },
  BANNED: { label: 'Banned', variant: 'destructive' },
};

interface MemberStatusBadgeProps {
  status: MemberStatus;
  className?: string;
}

export function MemberStatusBadge({ status, className }: MemberStatusBadgeProps) {
  const { label, variant } = config[status] ?? { label: status, variant: 'secondary' as const };
  return (
    <Badge variant={variant as any} className={className}>
      {label}
    </Badge>
  );
}
