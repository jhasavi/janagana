'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiCall } from '@/lib/api';
import type {
  EventListItem,
  EventDetail,
  EventFilters,
  EventStats,
  CalendarView,
  EventCategory,
  EventRegistration,
  AttendanceReport,
  WaitlistEntry,
  QRCodeData,
  PaginatedResponse,
} from '@/lib/types/event';
import type {
  CreateEventInput,
  UpdateEventInput,
  UpdateEventStatusInput,
  RegisterMemberInput,
  CheckInInput,
  SendRemindersInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/lib/validations/event';

// ─── Internal helper ──────────────────────────────────────────────────────────

function useApiContext() {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();
  return { getToken, slug: tenant?.slug ?? '' };
}

// ─── Event list ───────────────────────────────────────────────────────────────

export function useEvents(filters: EventFilters = {}) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['events', slug, filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaginatedResponse<EventListItem>>('/events', slug, token, {
        params: filters as Record<string, string | number | boolean | null | undefined>,
      });
    },
    enabled: !!slug,
    staleTime: 30_000,
  });
}

// ─── Single event ─────────────────────────────────────────────────────────────

export function useEvent(eventId: string | null | undefined) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['events', slug, eventId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<EventDetail>(`/events/${eventId}`, slug, token);
    },
    enabled: !!slug && !!eventId,
    staleTime: 30_000,
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useEventStats() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['events', slug, 'stats'],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<EventStats>('/events/stats', slug, token);
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}

// ─── Calendar view ────────────────────────────────────────────────────────────

export function useEventCalendar(month: number, year: number) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['events', slug, 'calendar', month, year],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<CalendarView>('/events/calendar', slug, token, { params: { month, year } });
    },
    enabled: !!slug,
    staleTime: 30_000,
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function useEventCategories() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['event-categories', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaginatedResponse<EventCategory>>('/events/categories', slug, token, {
        params: { limit: 100 },
      });
    },
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

// ─── Registrations ────────────────────────────────────────────────────────────

export function useEventRegistrations(
  eventId: string | null | undefined,
  filters: { status?: string; page?: number; limit?: number } = {},
) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['events', slug, eventId, 'registrations', filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaginatedResponse<EventRegistration>>(
        `/events/${eventId}/registrations`,
        slug,
        token,
        { params: filters as Record<string, string | number | boolean | null | undefined> },
      );
    },
    enabled: !!slug && !!eventId,
    staleTime: 15_000,
  });
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export function useEventAttendance(eventId: string | null | undefined) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['events', slug, eventId, 'attendance'],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<AttendanceReport>(`/events/${eventId}/attendance`, slug, token);
    },
    enabled: !!slug && !!eventId,
    staleTime: 10_000,
  });
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export function useEventWaitlist(eventId: string | null | undefined) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['events', slug, eventId, 'waitlist'],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<WaitlistEntry[]>(`/events/${eventId}/waitlist`, slug, token);
    },
    enabled: !!slug && !!eventId,
    staleTime: 15_000,
  });
}

// ─── QR Code ──────────────────────────────────────────────────────────────────

export function useRegistrationQRCode(eventId: string | null, registrationId: string | null) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['events', slug, eventId, 'qr', registrationId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<QRCodeData>(`/events/${eventId}/qr/${registrationId}`, slug, token);
    },
    enabled: !!slug && !!eventId && !!registrationId,
    staleTime: 5 * 60_000,
  });
}

// ─── Create event ─────────────────────────────────────────────────────────────

export function useCreateEvent() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEventInput) => {
      const token = await getToken();
      return apiCall<EventDetail>('/events', slug, token, { body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}

// ─── Update event ─────────────────────────────────────────────────────────────

export function useUpdateEvent() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEventInput }) => {
      const token = await getToken();
      return apiCall<EventDetail>(`/events/${id}`, slug, token, { method: 'PATCH', body: data });
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ['events', slug, id] });
      void qc.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}

// ─── Update status ────────────────────────────────────────────────────────────

export function useUpdateEventStatus() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEventStatusInput }) => {
      const token = await getToken();
      return apiCall<EventListItem>(`/events/${id}/status`, slug, token, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ['events', slug, id] });
      void qc.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}

// ─── Delete event ─────────────────────────────────────────────────────────────

export function useDeleteEvent() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<{ deleted: boolean; id: string }>(`/events/${id}`, slug, token, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}

// ─── Duplicate event ──────────────────────────────────────────────────────────

export function useDuplicateEvent() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<EventDetail>(`/events/${id}/duplicate`, slug, token, { method: 'POST', body: {} });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events', slug] });
    },
  });
}

// ─── Register member ──────────────────────────────────────────────────────────

export function useRegisterMember(eventId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RegisterMemberInput) => {
      const token = await getToken();
      return apiCall<EventRegistration>(`/events/${eventId}/register`, slug, token, { body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events', slug, eventId, 'registrations'] });
      void qc.invalidateQueries({ queryKey: ['events', slug, eventId] });
    },
  });
}

// ─── Cancel registration ──────────────────────────────────────────────────────

export function useCancelRegistration(eventId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (registrationId: string) => {
      const token = await getToken();
      return apiCall<{ canceled: boolean; registrationId: string }>(
        `/events/${eventId}/registrations/${registrationId}`,
        slug,
        token,
        { method: 'DELETE' },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events', slug, eventId, 'registrations'] });
      void qc.invalidateQueries({ queryKey: ['events', slug, eventId, 'waitlist'] });
    },
  });
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

export function useCheckIn(eventId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CheckInInput) => {
      const token = await getToken();
      return apiCall<{
        checkedIn?: boolean;
        alreadyCheckedIn?: boolean;
        checkedInAt: string;
        member: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null };
      }>(`/events/${eventId}/check-in`, slug, token, { body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events', slug, eventId, 'attendance'] });
      void qc.invalidateQueries({ queryKey: ['events', slug, eventId, 'registrations'] });
    },
  });
}

// ─── Process waitlist ─────────────────────────────────────────────────────────

export function useProcessWaitlist(eventId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiCall<{ promoted: boolean; member: unknown } | null>(
        `/events/${eventId}/process-waitlist`,
        slug,
        token,
        { method: 'POST', body: {} },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events', slug, eventId, 'waitlist'] });
      void qc.invalidateQueries({ queryKey: ['events', slug, eventId, 'registrations'] });
    },
  });
}

// ─── Send reminders ───────────────────────────────────────────────────────────

export function useSendReminders(eventId: string) {
  const { getToken, slug } = useApiContext();
  return useMutation({
    mutationFn: async (data: SendRemindersInput) => {
      const token = await getToken();
      return apiCall<{ sent: number; eventId: string; message: string | null }>(
        `/events/${eventId}/send-reminders`,
        slug,
        token,
        { body: data },
      );
    },
  });
}

// ─── Category mutations ───────────────────────────────────────────────────────

export function useCreateCategory() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCategoryInput) => {
      const token = await getToken();
      return apiCall<EventCategory>('/events/categories', slug, token, { body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['event-categories', slug] });
    },
  });
}

export function useUpdateCategory() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryInput }) => {
      const token = await getToken();
      return apiCall<EventCategory>(`/events/categories/${id}`, slug, token, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['event-categories', slug] });
    },
  });
}

export function useDeleteCategory() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<{ deleted: boolean; id: string }>(
        `/events/categories/${id}`,
        slug,
        token,
        { method: 'DELETE' },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['event-categories', slug] });
    },
  });
}

// ─── Export registrations ─────────────────────────────────────────────────────

export function useExportRegistrations() {
  const { getToken, slug } = useApiContext();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const token = await getToken();
      const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
      const res = await fetch(`${BASE_URL}/api/v1/events/${eventId}/export`, {
        headers: {
          'x-tenant-slug': slug,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-${eventId}-registrations.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
