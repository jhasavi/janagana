'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiCall } from '@/lib/api';
import type {
  FullTenantSettings,
  UsageStats,
  CustomField,
  TeamMember,
  InvoiceItem,
  UpdateOrganizationInput,
  UpdateBrandingInput,
  UpdatePortalInput,
  UpsertCustomFieldInput,
  InviteTeamMemberInput,
} from '@/lib/types/settings';

function useApiContext() {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();
  return { getToken, slug: tenant?.slug ?? '' };
}

// ─── Core settings read ──────────────────────────────────────────────────────

export function useSettings() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['settings', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<FullTenantSettings>('/settings', slug, token);
    },
    enabled: Boolean(slug),
    staleTime: 30 * 1000,
  });
}

// ─── Organisation ─────────────────────────────────────────────────────────────

export function useUpdateOrganization() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateOrganizationInput) => {
      const token = await getToken();
      return apiCall<FullTenantSettings>('/settings/organization', slug, token, {
        method: 'PATCH', body: data,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', slug] }),
  });
}

export function useCheckSlug(slugValue: string, enabled = false) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['slug-check', slug, slugValue],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<{ available: boolean }>('/settings/slug-check', slug, token, {
        params: { slug: slugValue },
      });
    },
    enabled: Boolean(slug) && enabled && slugValue.length >= 3,
    staleTime: 10_000,
  });
}

// ─── Branding ─────────────────────────────────────────────────────────────────

export function useUpdateBranding() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateBrandingInput) => {
      const token = await getToken();
      return apiCall<FullTenantSettings>('/settings/branding', slug, token, {
        method: 'PATCH', body: data,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', slug] }),
  });
}

// ─── Portal ───────────────────────────────────────────────────────────────────

export function useUpdatePortalSettings() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdatePortalInput) => {
      const token = await getToken();
      return apiCall<FullTenantSettings>('/settings/portal', slug, token, {
        method: 'PATCH', body: data,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', slug] }),
  });
}

// ─── Custom fields ────────────────────────────────────────────────────────────

export function useCustomFields() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['custom-fields', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<CustomField[]>('/settings/custom-fields', slug, token);
    },
    enabled: Boolean(slug),
  });
}

export function useCreateCustomField() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpsertCustomFieldInput) => {
      const token = await getToken();
      return apiCall<CustomField>('/settings/custom-fields', slug, token, { body: data });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields', slug] }),
  });
}

export function useUpdateCustomField() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpsertCustomFieldInput }) => {
      const token = await getToken();
      return apiCall<CustomField>(`/settings/custom-fields/${id}`, slug, token, {
        method: 'PATCH', body: data,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields', slug] }),
  });
}

export function useDeleteCustomField() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall(`/settings/custom-fields/${id}`, slug, token, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields', slug] }),
  });
}

export function useReorderCustomFields() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const token = await getToken();
      return apiCall<CustomField[]>('/settings/custom-fields/reorder', slug, token, {
        method: 'PATCH', body: { ids },
      });
    },
    onSuccess: (data) => {
      qc.setQueryData(['custom-fields', slug], data);
    },
  });
}

// ─── Team members ─────────────────────────────────────────────────────────────

export function useTeamMembers() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['team', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<TeamMember[]>('/settings/team', slug, token);
    },
    enabled: Boolean(slug),
  });
}

export function useInviteTeamMember() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: InviteTeamMemberInput) => {
      const token = await getToken();
      return apiCall<TeamMember>('/settings/team/invite', slug, token, { body: data });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', slug] }),
  });
}

export function useUpdateTeamMember() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { role?: string; isActive?: boolean } }) => {
      const token = await getToken();
      return apiCall<TeamMember>(`/settings/team/${id}`, slug, token, {
        method: 'PATCH', body: data,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', slug] }),
  });
}

export function useRemoveTeamMember() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiCall(`/settings/team/${id}`, slug, token, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', slug] }),
  });
}

// ─── Usage & billing ──────────────────────────────────────────────────────────

export function useUsageStats() {
  const { getToken, slug } = useApiContext();
  return useQuery<UsageStats>({
    queryKey: ['usage', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<UsageStats>('/settings/usage', slug, token);
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBillingHistory() {
  const { getToken, slug } = useApiContext();
  return useQuery<InvoiceItem[]>({
    queryKey: ['billing-history', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<InvoiceItem[]>('/settings/billing-history', slug, token);
    },
    enabled: Boolean(slug),
  });
}
