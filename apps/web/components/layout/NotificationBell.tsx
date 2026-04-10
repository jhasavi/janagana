'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2, Mail, AlertTriangle, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiCall } from '@/lib/api';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { useApiToken, getStoredMemberId } from '@/hooks/useMemberAuth';
import { useNotifications, useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useSSENotifications } from '@/hooks/useSSENotifications';
import type { NotificationItem } from '@/lib/types/notifications';

const ICONS: Record<string, React.ElementType> = {
  event: Sparkles,
  approval: CheckCircle2,
  announcement: AlertTriangle,
  payment: Mail,
  club: Bell,
};

export function NotificationBell() {
  const { tenant } = useCurrentTenant();
  const { getToken, token } = useApiToken();
  const [open, setOpen] = React.useState(false);
  const [memberId, setMemberId] = React.useState<string>('');
  const { data: notifications = [] } = useNotifications(memberId);
  const { data: count } = useUnreadNotificationCount(memberId);
  const { connectionError } = useSSENotifications(memberId);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    setMemberId(getStoredMemberId() ?? '');
  }, []);

  const unreadCount = count?.unreadCount ?? notifications.filter((n) => n.status === 'UNREAD').length;

  const markAllRead = async () => {
    if (!memberId || !tenant?.slug) return;
    const tokenValue = await getToken();
    await apiCall('/communications/notifications/read-all', tenant.slug, tokenValue, {
      method: 'PATCH',
      body: { memberId },
    });
    queryClient.invalidateQueries({ queryKey: ['notifications', tenant.slug, memberId] } as any);
    queryClient.invalidateQueries({ queryKey: ['notification-count', tenant.slug, memberId] } as any);
  };

  const markRead = async (notificationId: string) => {
    if (!memberId || !tenant?.slug) return;
    const tokenValue = await getToken();
    await apiCall(`/communications/notifications/${notificationId}/read`, tenant.slug, tokenValue, {
      method: 'PATCH',
      params: { memberId },
    });
    queryClient.invalidateQueries({ queryKey: ['notifications', tenant.slug, memberId] } as any);
    queryClient.invalidateQueries({ queryKey: ['notification-count', tenant.slug, memberId] } as any);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((current) => !current)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-3xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">Latest updates for your portal.</p>
            </div>
            <Button variant="outline" size="icon" onClick={markAllRead} disabled={!unreadCount}>
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
          {connectionError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              Live updates disconnected: {connectionError}
            </div>
          ) : null}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => {
                const Icon = ICONS[notification.type] ?? Sparkles;
                return (
                  <div key={notification.id} className="rounded-3xl border border-border p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.body}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{new Date(notification.createdAt).toLocaleString()}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markRead(notification.id)}
                        aria-label="Mark as read"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {notification.actionUrl ? (
                      <Link href={notification.actionUrl} className="mt-3 inline-flex text-sm text-primary hover:underline">
                        Open action
                      </Link>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>{notifications.length ? `Showing ${Math.min(notifications.length, 5)} of ${notifications.length}` : 'No recent events'}</span>
            <Link href="/portal/notifications" className="text-primary hover:underline">
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
