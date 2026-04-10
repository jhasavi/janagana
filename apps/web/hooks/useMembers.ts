'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiCall, apiUpload } from '@/lib/api';
import type {
  MemberListItem,
  MemberDetail,
  MemberStats,
  MemberActivity,
  MemberNote,
  MemberDocument,
  MemberCustomField,
  MembershipTier,
  PaginatedResponse,
  ImportSummary,
  MemberFilters,
} from '@/lib/types/member';
import type {
  CreateMemberInput,
  UpdateMemberInput,
  AddNoteInput,
  SendEmailInput,
  RenewMembershipInput,
  CreateTierInput,
  UpdateTierInput,
} from '@/lib/validations/member';

// ─── Internal helper ──────────────────────────────────────────────────────────

function useApiContext() {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();
  return { getToken, slug: tenant?.slug ?? '' };
}

// ─── Members list ─────────────────────────────────────────────────────────────

export function useMembers(filters: MemberFilters = {}) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['members', slug, filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaginatedResponse<MemberListItem>>('/members', slug, token, {
        params: filters as Record<string, string | number | boolean | null | undefined>,
      });
    },
    enabled: !!slug,
    staleTime: 30_000,
  });
}

// ─── Single member ────────────────────────────────────────────────────────────

export function useMember(memberId: string | null | undefined) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['members', slug, memberId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MemberDetail>(`/members/${memberId}`, slug, token);
    },
    enabled: !!slug && !!memberId,
    staleTime: 30_000,
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useMemberStats() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['members', slug, 'stats'],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MemberStats>('/members/stats', slug, token);
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export function useMemberActivity(memberId: string | null | undefined) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['members', slug, memberId, 'activity'],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MemberActivity>(`/members/${memberId}/activity`, slug, token);
    },
    enabled: !!slug && !!memberId,
  });
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function useMemberNotes(memberId: string | null | undefined) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['members', slug, memberId, 'notes'],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MemberNote[]>(`/members/${memberId}/notes`, slug, token);
    },
    enabled: !!slug && !!memberId,
  });
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function useMemberDocuments(memberId: string | null | undefined) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['members', slug, memberId, 'documents'],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MemberDocument[]>(`/members/${memberId}/documents`, slug, token);
    },
    enabled: !!slug && !!memberId,
  });
}

// ─── Custom fields ────────────────────────────────────────────────────────────

export function useMemberCustomFields() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['members', slug, 'custom-fields'],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MemberCustomField[]>('/members/custom-fields', slug, token);
    },
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

// ─── Membership tiers ─────────────────────────────────────────────────────────

export function useMembershipTiers() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['membership-tiers', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MembershipTier[]>('/membership-tiers', slug, token);
    },
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useMembershipTier(tierId: string | null | undefined) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['membership-tiers', slug, tierId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<MembershipTier>(`/membership-tiers/${tierId}`, slug, token);
    },
    enabled: !!slug && !!tierId,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateMember() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMemberInput) => {
      const token = await getToken();
      return apiCall<MemberDetail>('/members', slug, token, { body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members', slug] });
    },
  });
}

export function useUpdateMember() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMemberInput }) => {
      const token = await getToken();
      return apiCall<MemberDetail>(`/members/${id}`, slug, token, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ['members', slug, id] });
      void qc.invalidateQueries({ queryKey: ['members', slug] });
    },
  });
}

export function useDeleteMember() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<void>(`/members/${id}`, slug, token, { method: 'DELETE' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members', slug] });
    },
  });
}

export function useUpdateMemberStatus() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = await getToken();
      return apiCall<{ id: string; status: string }>(`/members/${id}/status`, slug, token, {
        method: 'PATCH',
        body: { status },
      });
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ['members', slug, id] });
      void qc.invalidateQueries({ queryKey: ['members', slug] });
    },
  });
}

export function useAddMemberNote() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: AddNoteInput }) => {
      const token = await getToken();
      return apiCall<MemberNote>(`/members/${memberId}/notes`, slug, token, { body: data });
    },
    onSuccess: (_data, { memberId }) => {
      void qc.invalidateQueries({ queryKey: ['members', slug, memberId, 'notes'] });
    },
  });
}

export function useSendMemberEmail() {
  const { getToken, slug } = useApiContext();
  return useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: SendEmailInput }) => {
      const token = await getToken();
      return apiCall<{ queued: number }>(`/members/${memberId}/send-email`, slug, token, { body: data });
    },
  });
}

export function useRenewMembership() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: RenewMembershipInput }) => {
      const token = await getToken();
      return apiCall<Record<string, unknown>>(`/members/${memberId}/renew`, slug, token, { body: data });
    },
    onSuccess: (_data, { memberId }) => {
      void qc.invalidateQueries({ queryKey: ['members', slug, memberId] });
      void qc.invalidateQueries({ queryKey: ['members', slug] });
    },
  });
}

export function useImportMembers() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      duplicateStrategy,
    }: {
      file: File;
      duplicateStrategy: 'SKIP' | 'UPDATE';
    }) => {
      const token = await getToken();
      const fd = new FormData();
      fd.append('file', file);
      return apiUpload<ImportSummary>('/members/import', slug, token, fd, {
        duplicateStrategy,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members', slug] });
    },
  });
}

// ─── Tier mutations ───────────────────────────────────────────────────────────

export function useCreateTier() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTierInput) => {
      const token = await getToken();
      return apiCall<MembershipTier>('/membership-tiers', slug, token, { body: data });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership-tiers', slug] });
    },
  });
}

export function useUpdateTier() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTierInput }) => {
      const token = await getToken();
      return apiCall<MembershipTier>(`/membership-tiers/${id}`, slug, token, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership-tiers', slug] });
    },
  });
}

export function useDeleteTier() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall<void>(`/membership-tiers/${id}`, slug, token, { method: 'DELETE' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership-tiers', slug] });
    },
  });
}
