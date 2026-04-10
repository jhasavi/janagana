import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Status =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'cancelled'
  | 'suspended'
  | 'published'
  | 'draft'
  | 'completed'
  | 'expired';

const statusConfig: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  published: { label: 'Published', variant: 'success' },
  draft: { label: 'Draft', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'info' },
  expired: { label: 'Expired', variant: 'outline' },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: 'secondary' as const };
  return (
    <Badge variant={config.variant as any} className={cn('capitalize', className)}>
      {config.label}
    </Badge>
  );
}
