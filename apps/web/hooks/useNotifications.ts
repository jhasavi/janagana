'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiCall } from '@/lib/api';
import { useApiToken } from '@/hooks/useMemberAuth';
import type { NotificationItem, NotificationCount } from '@/lib/types/notifications';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

function useApiContext() {
  const { getToken } = useApiToken();
  const { tenant } = useCurrentTenant();
  return { getToken, slug: tenant?.slug ?? '' };
}

export function useNotifications(memberId?: string) {
  const { getToken, slug } = useApiContext();

  return useQuery({
    queryKey: ['notifications', slug, memberId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<NotificationItem[]>('/communications/notifications', slug, token, {
        params: { memberId },
      });
    },
    enabled: Boolean(memberId) && Boolean(slug),
    staleTime: 30 * 1000,
  });
}

export function useUnreadNotificationCount(memberId?: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['notification-count', slug, memberId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<NotificationCount>('/communications/notifications/unread-count', slug, token, {
        params: { memberId },
      });
    },
    enabled: Boolean(memberId) && Boolean(slug),
    staleTime: 15 * 1000,
  });
}

export function useNotificationStream(memberId?: string) {
  const { getToken, slug } = useApiContext();
  const queryClient = useQueryClient();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId || !slug) return undefined;
    let active = true;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    const controller = new AbortController();
    const notificationsKey = ['notifications', slug, memberId] as const;
    const notificationCountKey = ['notification-count', slug, memberId] as const;
    const url = `${BASE_URL}/api/v1/communications/notifications/stream?memberId=${encodeURIComponent(memberId)}`;

    const connect = async () => {
      try {
        const token = await getToken();
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'x-tenant-slug': slug,
          },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`Unable to open notification stream: ${res.status}`);
        }

        const decoder = new TextDecoder();
        let buffer = '';
        reader = res.body.getReader();

        while (active) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 2);
            if (chunk.startsWith('data:')) {
              const payload = chunk.slice(5).trim();
              if (payload) {
                try {
                  const notification = JSON.parse(payload) as NotificationItem;
                  queryClient.setQueryData<NotificationItem[]>(notificationsKey, (current = []) => {
                    return [notification, ...current].slice(0, 50);
                  });
                  queryClient.invalidateQueries({ queryKey: notificationCountKey } as any);
                } catch (error) {
                  setConnectionError('Failed to parse notification stream message.');
                }
              }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        if (active) {
          setConnectionError((error as Error).message);
        }
      }
    };

    connect();

    return () => {
      active = false;
      controller.abort();
      if (reader) {
        void reader.cancel();
      }
    };
  }, [memberId, slug, getToken, queryClient]);

  return useMemo(() => ({ connectionError }), [connectionError]);
}
