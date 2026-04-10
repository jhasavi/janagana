'use client';

import * as React from 'react';
import { BellRing, CheckCircle2, AlertTriangle, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type NotificationType = string;

interface NotificationItemProps {
  title: string;
  body: string;
  date: string;
  type: NotificationType;
  unread?: boolean;
  onMarkRead?: () => void;
}

const ICONS: Record<string, React.ElementType> = {
  event: BellRing,
  approval: CheckCircle2,
  announcement: AlertTriangle,
  payment: Mail,
  club: BellRing,
};

const LABELS: Record<string, string> = {
  event: 'Event reminder',
  approval: 'Approval',
  announcement: 'Announcement',
  payment: 'Payment',
  club: 'Club activity',
};

export function NotificationItem({ title, body, date, type, unread, onMarkRead }: NotificationItemProps) {
  const Icon = ICONS[type] ?? BellRing;
  const label = LABELS[type] ?? 'Update';

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        </div>
        <Badge variant={unread ? 'secondary' : 'outline'}>{label}</Badge>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{date}</span>
        {unread && (
          <Button variant="ghost" size="sm" onClick={onMarkRead}>
            Mark read
          </Button>
        )}
      </div>
    </div>
  );
}
