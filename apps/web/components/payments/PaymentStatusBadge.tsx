'use client';

import { Badge } from '@/components/ui/badge';

interface PaymentStatusBadgeProps {
  status: string;
}

const statusMap: Record<string, { text: string; variant: string }> = {
  PENDING: { text: 'Pending', variant: 'yellow' },
  SUCCEEDED: { text: 'Succeeded', variant: 'green' },
  FAILED: { text: 'Failed', variant: 'destructive' },
  REFUNDED: { text: 'Refunded', variant: 'secondary' },
  PARTIALLY_REFUNDED: { text: 'Partial', variant: 'outline' },
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = statusMap[status] ?? { text: status, variant: 'secondary' };
  return <Badge variant={config.variant as any}>{config.text}</Badge>;
}
