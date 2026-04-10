'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { NotificationItem } from '@/components/portal/NotificationItem';
import { useNotifications, useNotificationStream } from '@/hooks/useNotifications';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiCall } from '@/lib/api';

const MEMBER_ID_KEY = 'portalMemberId';

function getMemberId() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(MEMBER_ID_KEY) ?? '';
}

export default function PortalNotificationsPage() {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();
  const queryClient = useQueryClient();
  const [memberId, setMemberId] = useState('');

  useEffect(() => {
    setMemberId(getMemberId());
  }, []);

  const { data: notifications = [], isLoading } = useNotifications(memberId);
  const { connectionError } = useNotificationStream(memberId);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.status === 'UNREAD').length,
    [notifications],
  );

  const markRead = async (id: string) => {
    if (!memberId || !tenant?.slug) return;
    const token = await getToken();
    await apiCall(`/communications/notifications/${id}/read`, tenant.slug, token, {
      method: 'PATCH',
      params: { memberId },
    });
    queryClient.invalidateQueries({ queryKey: ['notifications', tenant.slug, memberId] });
    queryClient.invalidateQueries({ queryKey: ['notification-count', tenant.slug, memberId] });
  };

  const markAllRead = async () => {
    if (!memberId || !tenant?.slug) return;
    const token = await getToken();
    await apiCall('/communications/notifications/read-all', tenant.slug, token, {
      method: 'PATCH',
      body: { memberId },
    });
    queryClient.invalidateQueries({ queryKey: ['notifications', tenant.slug, memberId] });
    queryClient.invalidateQueries({ queryKey: ['notification-count', tenant.slug, memberId] });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">Recent updates, reminders, and announcements for your membership.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0 || isLoading}>
            Mark all read
          </Button>
        </div>
      </div>

      {connectionError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Live notification stream disconnected: {connectionError}
        </div>
      ) : null}

      {!memberId ? (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Member ID is not configured. Please set your portal member ID to receive notifications.
        </div>
      ) : (
        <div className="grid gap-4">
          {isLoading ? (
            <div className="rounded-xl border p-6 text-sm text-muted-foreground">Loading notifications…</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border p-6 text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                title={notification.title}
                body={notification.body}
                date={new Date(notification.createdAt).toLocaleDateString()}
                type={notification.type as any}
                unread={notification.status === 'UNREAD'}
                onMarkRead={() => markRead(notification.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
