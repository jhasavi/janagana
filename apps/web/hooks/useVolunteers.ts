'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiCall } from '@/lib/api';
import type {
  VolunteerOpportunityListItem,
  VolunteerOpportunityDetail,
  VolunteerApplication,
  VolunteerShift,
  ShiftRoster,
  VolunteerHoursLog,
  MemberHoursBreakdown,
  OrgHoursReport,
  VolunteerStats,
  MemberVolunteerProfile,
  PaginatedResponse,
  OpportunityFilters,
  ApplicationFilters,
  HoursFilters,
} from '@/lib/types/volunteer';
import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  AddShiftInput,
  SubmitApplicationInput,
  ReviewApplicationInput,
  LogHoursInput,
} from '@/lib/validations/volunteer';

// ─── Internal helper ──────────────────────────────────────────────────────────

function useApiContext() {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();
  return { getToken, slug: tenant?.slug ?? '' };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useVolunteerStats() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-stats', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<VolunteerStats>('/volunteers/opportunities/stats', slug, token);
    },
    enabled: Boolean(slug),
  });
}

// ─── Opportunities ─────────────────────────────────────────────────────────────

export function useOpportunities(filters: OpportunityFilters = {}) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-opportunities', slug, filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaginatedResponse<VolunteerOpportunityListItem>>(
        '/volunteers/opportunities',
        slug,
        token,
        { params: filters as Record<string, string | number | boolean | null | undefined> },
      );
    },
    enabled: Boolean(slug),
  });
}

export function usePublicOpportunities(filters: OpportunityFilters = {}) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-opportunities-public', slug, filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<VolunteerOpportunityListItem[]>(
        '/volunteers/opportunities/public',
        slug,
        token,
        { params: filters as Record<string, string | number | boolean | null | undefined> },
      );
    },
    enabled: Boolean(slug),
  });
}

export function useOpportunity(id: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-opportunity', slug, id],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<VolunteerOpportunityDetail>(`/volunteers/opportunities/${id}`, slug, token);
    },
    enabled: Boolean(slug) && Boolean(id),
  });
}

export function useCreateOpportunity() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOpportunityInput) => {
      const token = await getToken();
      return apiCall<VolunteerOpportunityDetail>('/volunteers/opportunities', slug, token, {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunities', slug] });
      void qc.invalidateQueries({ queryKey: ['volunteer-stats', slug] });
    },
  });
}

export function useUpdateOpportunity(id: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateOpportunityInput) => {
      const token = await getToken();
      return apiCall<VolunteerOpportunityDetail>(`/volunteers/opportunities/${id}`, slug, token, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunity', slug, id] });
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunities', slug] });
    },
  });
}

export function useDeleteOpportunity() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<void>(`/volunteers/opportunities/${id}`, slug, token, { method: 'DELETE' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunities', slug] });
      void qc.invalidateQueries({ queryKey: ['volunteer-stats', slug] });
    },
  });
}

export function usePublishOpportunity() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<VolunteerOpportunityDetail>(`/volunteers/opportunities/${id}/publish`, slug, token, { method: 'PATCH' });
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunity', slug, id] });
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunities', slug] });
    },
  });
}

export function useCloseOpportunity() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<VolunteerOpportunityDetail>(`/volunteers/opportunities/${id}/close`, slug, token, { method: 'PATCH' });
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunity', slug, id] });
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunities', slug] });
    },
  });
}

export function useDuplicateOpportunity() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<VolunteerOpportunityDetail>(`/volunteers/opportunities/${id}/duplicate`, slug, token, { method: 'POST' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunities', slug] });
    },
  });
}

// ─── Opportunity Shifts ────────────────────────────────────────────────────────

export function useOpportunityShifts(opportunityId: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-shifts', slug, opportunityId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<VolunteerShift[]>(`/volunteers/opportunities/${opportunityId}/shifts`, slug, token);
    },
    enabled: Boolean(slug) && Boolean(opportunityId),
  });
}

export function useAddShift(opportunityId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AddShiftInput) => {
      const token = await getToken();
      return apiCall<VolunteerShift>(`/volunteers/opportunities/${opportunityId}/shifts`, slug, token, { method: 'POST', body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-shifts', slug, opportunityId] });
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunity', slug, opportunityId] });
    },
  });
}

export function useUpdateShift(opportunityId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, data }: { shiftId: string; data: Partial<AddShiftInput> }) => {
      const token = await getToken();
      return apiCall<VolunteerShift>(`/volunteers/opportunities/${opportunityId}/shifts/${shiftId}`, slug, token, { method: 'PATCH', body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-shifts', slug, opportunityId] });
    },
  });
}

export function useShiftRoster(opportunityId: string, shiftId: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-shift-roster', slug, opportunityId, shiftId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<ShiftRoster>(`/volunteers/opportunities/${opportunityId}/shifts/${shiftId}/roster`, slug, token);
    },
    enabled: Boolean(slug) && Boolean(opportunityId) && Boolean(shiftId),
  });
}

export function useSignUpForShift() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const token = await getToken();
      return apiCall<void>(`/volunteers/shifts/${shiftId}/signup`, slug, token, { method: 'POST' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-shifts', slug] });
    },
  });
}

export function useCancelShiftSignup() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const token = await getToken();
      return apiCall<void>(`/volunteers/shifts/${shiftId}/signup`, slug, token, { method: 'DELETE' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-shifts', slug] });
    },
  });
}

export function useMarkShiftComplete() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const token = await getToken();
      return apiCall<VolunteerShift>(`/volunteers/shifts/${shiftId}/complete`, slug, token, { method: 'PATCH' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-shifts', slug] });
      void qc.invalidateQueries({ queryKey: ['volunteer-opportunities', slug] });
    },
  });
}

// ─── Applications ─────────────────────────────────────────────────────────────

export function useApplications(filters: ApplicationFilters = {}) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-applications', slug, filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaginatedResponse<VolunteerApplication>>(
        '/volunteers/applications',
        slug,
        token,
        { params: filters as Record<string, string | number | boolean | null | undefined> },
      );
    },
    enabled: Boolean(slug),
  });
}

export function useOpportunityApplications(opportunityId: string, filters: ApplicationFilters = {}) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-opp-applications', slug, opportunityId, filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaginatedResponse<VolunteerApplication>>(
        `/volunteers/opportunities/${opportunityId}/applications`,
        slug,
        token,
        { params: filters as Record<string, string | number | boolean | null | undefined> },
      );
    },
    enabled: Boolean(slug) && Boolean(opportunityId),
  });
}

export function useSubmitApplication() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SubmitApplicationInput) => {
      const token = await getToken();
      return apiCall<VolunteerApplication>('/volunteers/applications', slug, token, { method: 'POST', body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-applications', slug] });
      void qc.invalidateQueries({ queryKey: ['volunteer-stats', slug] });
    },
  });
}

export function useReviewApplication() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ReviewApplicationInput }) => {
      const token = await getToken();
      return apiCall<VolunteerApplication>(`/volunteers/applications/${id}/review`, slug, token, { method: 'PATCH', body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-applications', slug] });
      void qc.invalidateQueries({ queryKey: ['volunteer-opp-applications', slug] });
      void qc.invalidateQueries({ queryKey: ['volunteer-stats', slug] });
    },
  });
}

export function useBulkReviewApplications() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationIds, status }: { applicationIds: string[]; status: string }) => {
      const token = await getToken();
      return apiCall<void>('/volunteers/applications/bulk-review', slug, token, {
        method: 'POST',
        body: { applicationIds, status },
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-applications', slug] });
      void qc.invalidateQueries({ queryKey: ['volunteer-opp-applications', slug] });
    },
  });
}

export function useWithdrawApplication() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<VolunteerApplication>(`/volunteers/applications/${id}/withdraw`, slug, token, { method: 'POST' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-applications', slug] });
    },
  });
}

// ─── Hours ────────────────────────────────────────────────────────────────────

export function useOrganizationHours(filters: HoursFilters = {}) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-hours', slug, filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<OrgHoursReport>('/volunteers/hours/report', slug, token, {
        params: filters as Record<string, string | number | boolean | null | undefined>,
      });
    },
    enabled: Boolean(slug),
  });
}

export function useMemberHours(memberId: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-member-hours', slug, memberId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MemberHoursBreakdown>(`/volunteers/members/${memberId}/hours`, slug, token);
    },
    enabled: Boolean(slug) && Boolean(memberId),
  });
}

export function useLogHours() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: LogHoursInput) => {
      const token = await getToken();
      return apiCall<VolunteerHoursLog>('/volunteers/hours', slug, token, { method: 'POST', body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-hours', slug] });
    },
  });
}

export function useApproveHours() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<VolunteerHoursLog>(`/volunteers/hours/${id}/approve`, slug, token, { method: 'PATCH' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-hours', slug] });
      void qc.invalidateQueries({ queryKey: ['volunteer-member-hours', slug] });
    },
  });
}

export function useRejectHours() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const token = await getToken();
      return apiCall<void>(`/volunteers/hours/${id}/reject`, slug, token, { method: 'PATCH', body: { reason } });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['volunteer-hours', slug] });
    },
  });
}

export function useExportHours() {
  const { getToken, slug } = useApiContext();
  return useMutation({
    mutationFn: async (filters: HoursFilters = {}) => {
      const token = await getToken();
      const { BASE_URL } = await import('@/lib/api').then(() => ({ BASE_URL: (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '') }));
      const url = new URL(`${BASE_URL}/api/v1/volunteers/hours/export`);
      for (const [k, v] of Object.entries(filters)) {
        if (v != null && v !== '') url.searchParams.set(k, String(v));
      }
      const res = await fetch(url.toString(), {
        headers: {
          'x-tenant-slug': slug,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `volunteer-hours-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    },
  });
}

// ─── Member Volunteer Profile ──────────────────────────────────────────────────

export function useMemberVolunteerProfile(memberId: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['volunteer-member-profile', slug, memberId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MemberVolunteerProfile>(`/volunteers/members/${memberId}/profile`, slug, token);
    },
    enabled: Boolean(slug) && Boolean(memberId),
  });
}
