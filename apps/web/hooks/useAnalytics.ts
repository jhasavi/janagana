'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiCall } from '@/lib/api';
import type {
  DashboardStats,
  MemberAnalytics,
  EventAnalytics,
  VolunteerAnalytics,
  ClubAnalytics,
  RevenueAnalytics,
  ActivityItem,
  UpcomingEvent,
} from '@/lib/types/analytics';

function useApiContext() {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();
  return { getToken, slug: tenant?.slug ?? '' };
}

// ─── Dashboard overview ───────────────────────────────────────────────────────

export function useDashboardStats() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['analytics-overview', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<DashboardStats>('/analytics/overview', slug, token);
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000, // 5 min (mirrors server cache)
  });
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export function useActivityFeed() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['analytics-activity', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<ActivityItem[]>('/analytics/activity-feed', slug, token);
    },
    enabled: Boolean(slug),
    staleTime: 60 * 1000, // 1 min
  });
}

// ─── Upcoming events ──────────────────────────────────────────────────────────

export function useUpcomingEvents() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['analytics-upcoming', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<UpcomingEvent[]>('/analytics/upcoming-events', slug, token);
    },
    enabled: Boolean(slug),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Date range helpers ───────────────────────────────────────────────────────

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '3m', days: 90 },
  { label: '6m', days: 180 },
  { label: '1y', days: 365 },
] as const;

export function presetToRange(days: number): DateRange {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// ─── Tab analytics ────────────────────────────────────────────────────────────

export function useMemberAnalytics(range?: DateRange) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['analytics-members', slug, range],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MemberAnalytics>('/analytics/members', slug, token, {
        params: range as Record<string, string>,
      });
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEventAnalytics(range?: DateRange) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['analytics-events', slug, range],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<EventAnalytics>('/analytics/events', slug, token, {
        params: range as Record<string, string>,
      });
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVolunteerAnalytics(range?: DateRange) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['analytics-volunteers', slug, range],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<VolunteerAnalytics>('/analytics/volunteers', slug, token, {
        params: range as Record<string, string>,
      });
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

export function useClubAnalytics(range?: DateRange) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['analytics-clubs', slug, range],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<ClubAnalytics>('/analytics/clubs', slug, token, {
        params: range as Record<string, string>,
      });
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRevenueAnalytics(range?: DateRange) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['analytics-revenue', slug, range],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<RevenueAnalytics>('/analytics/revenue', slug, token, {
        params: range as Record<string, string>,
      });
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}
