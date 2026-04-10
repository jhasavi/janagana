'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiCall } from '@/lib/api';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { useApiToken } from '@/hooks/useMemberAuth';
import type { NotificationItem } from '@/lib/types/notifications';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export function useSSENotifications(memberId?: string) {
  const { tenant } = useCurrentTenant();
  const { getToken } = useApiToken();
  const queryClient = useQueryClient();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId || !tenant?.slug) return undefined;
    let active = true;
    let retryDelay = 1000;
    let controller = new AbortController();
    const notificationsKey = ['notifications', tenant.slug, memberId] as const;
    const notificationCountKey = ['notification-count', tenant.slug, memberId] as const;

    const connect = async () => {
      if (!active) return;
      setConnectionError(null);

      try {
        const token = await getToken();
        const url = `${BASE_URL}/api/v1/communications/notifications/stream?memberId=${encodeURIComponent(memberId)}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'x-tenant-slug': tenant.slug,
          },
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Unable to open notification stream (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (active) {
          const { value, done } = await reader.read();
          if (done || !value) break;
          buffer += decoder.decode(value, { stream: true });
          let index = buffer.indexOf('\n\n');

          while (index !== -1) {
            const chunk = buffer.slice(0, index).trim();
            buffer = buffer.slice(index + 2);
            if (chunk.startsWith('data:')) {
              const payload = chunk.slice(5).trim();
              if (payload) {
                const notification = JSON.parse(payload) as NotificationItem;
                queryClient.setQueryData<NotificationItem[]>(notificationsKey, (current = []) => {
                  const next = [notification, ...current];
                  return next.slice(0, 50);
                });
                queryClient.invalidateQueries({ queryKey: notificationCountKey } as any);
                if (['approval', 'payment', 'announcement'].includes(notification.type)) {
                  toast(`New notification: ${notification.title}`, { description: notification.body });
                }
              }
            }
            index = buffer.indexOf('\n\n');
          }
        }

        retryDelay = 1000;
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Notification stream failed';
        setConnectionError(message);
        controller = new AbortController();
        setTimeout(() => {
          if (!active) return;
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      }
    };

    connect();

    return () => {
      active = false;
      controller.abort();
    };
  }, [memberId, tenant?.slug, getToken, queryClient]);

  return useMemo(() => ({ connectionError }), [connectionError]);
}
