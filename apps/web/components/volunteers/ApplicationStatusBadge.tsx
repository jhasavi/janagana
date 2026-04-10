'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { VolunteerApplicationStatus } from '@/lib/types/volunteer';

const STATUS_CONFIG: Record<
  VolunteerApplicationStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'info' }
> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'secondary' },
};

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: VolunteerApplicationStatus;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: 'secondary' as const };
  return (
    <Badge variant={cfg.variant as any} className={className}>
      {cfg.label}
    </Badge>
  );
}
