'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { EventStatus } from '@/lib/types/event';

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'info' }
> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  CANCELED: { label: 'Canceled', variant: 'destructive' },
  COMPLETED: { label: 'Completed', variant: 'info' },
};

export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: 'secondary' as const };
  return (
    <Badge variant={cfg.variant as any} className={className}>
      {cfg.label}
    </Badge>
  );
}
