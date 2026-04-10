'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiCall } from '@/lib/api';
import type {
  ClubListItem,
  ClubDetail,
  ClubMembershipItem,
  ClubPost,
  ClubPostComment,
  ClubEventLink,
  ClubStats,
  ClubDetailStats,
  PaginatedResponse,
  ClubFilters,
} from '@/lib/types/club';
import type {
  CreateClubInput,
  UpdateClubInput,
  CreatePostInput,
  CreateCommentInput,
  InviteMemberInput,
} from '@/lib/validations/club';

// ─── Internal helper ──────────────────────────────────────────────────────────

function useApiContext() {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();
  return { getToken, slug: tenant?.slug ?? '' };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useClubStats() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['club-stats', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<ClubStats>('/clubs/stats', slug, token);
    },
    enabled: Boolean(slug),
  });
}

export function useClubDetailStats(clubId: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['club-detail-stats', slug, clubId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<ClubDetailStats>(`/clubs/${clubId}/stats`, slug, token);
    },
    enabled: Boolean(slug) && Boolean(clubId),
  });
}

// ─── Clubs list ───────────────────────────────────────────────────────────────

export function useClubs(filters: ClubFilters = {}) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['clubs', slug, filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaginatedResponse<ClubListItem>>('/clubs', slug, token, { params: filters as Record<string, string | number | boolean | null | undefined> });
    },
    enabled: Boolean(slug),
  });
}

export function useClub(clubId: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['club', slug, clubId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<ClubDetail>(`/clubs/${clubId}`, slug, token);
    },
    enabled: Boolean(slug) && Boolean(clubId),
  });
}

// ─── Club mutations ───────────────────────────────────────────────────────────

export function useCreateClub(memberId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateClubInput) => {
      const token = await getToken();
      return apiCall<ClubListItem>(`/clubs?memberId=${encodeURIComponent(memberId)}`, slug, token, {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['clubs', slug] }); },
  });
}

export function useUpdateClub(clubId: string, memberId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateClubInput) => {
      const token = await getToken();
      return apiCall<ClubListItem>(
        `/clubs/${clubId}?memberId=${encodeURIComponent(memberId)}`,
        slug,
        token,
        { method: 'PATCH', body: data },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['club', slug, clubId] });
      void qc.invalidateQueries({ queryKey: ['clubs', slug] });
    },
  });
}

export function useDeleteClub(clubId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiCall(`/clubs/${clubId}`, slug, token, { method: 'DELETE' });
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['clubs', slug] }); },
  });
}

// ─── Membership ───────────────────────────────────────────────────────────────

export function useClubMembers(clubId: string, filters: { role?: string; page?: number; limit?: number } = {}) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['club-members', slug, clubId, filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaginatedResponse<ClubMembershipItem>>(
        `/clubs/${clubId}/members`,
        slug,
        token,
        { params: filters },
      );
    },
    enabled: Boolean(slug) && Boolean(clubId),
  });
}

export function useMyClubMembership(clubId: string, memberId: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['club-my-membership', slug, clubId, memberId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<ClubMembershipItem | null>(
        `/clubs/${clubId}/my-membership?memberId=${encodeURIComponent(memberId)}`,
        slug,
        token,
      );
    },
    enabled: Boolean(slug) && Boolean(clubId) && Boolean(memberId),
  });
}

export function useJoinClub(clubId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const token = await getToken();
      return apiCall<ClubMembershipItem>(
        `/clubs/${clubId}/join?memberId=${encodeURIComponent(memberId)}`,
        slug,
        token,
        { method: 'POST', body: {} },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['club-members', slug, clubId] });
      void qc.invalidateQueries({ queryKey: ['club-my-membership', slug, clubId] });
      void qc.invalidateQueries({ queryKey: ['club', slug, clubId] });
    },
  });
}

export function useLeaveClub(clubId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const token = await getToken();
      return apiCall(
        `/clubs/${clubId}/leave?memberId=${encodeURIComponent(memberId)}`,
        slug,
        token,
        { method: 'DELETE' },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['club-members', slug, clubId] });
      void qc.invalidateQueries({ queryKey: ['club-my-membership', slug, clubId] });
      void qc.invalidateQueries({ queryKey: ['club', slug, clubId] });
    },
  });
}

export function useInviteMember(clubId: string, requestingMemberId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: InviteMemberInput) => {
      const token = await getToken();
      return apiCall(
        `/clubs/${clubId}/invite?memberId=${encodeURIComponent(requestingMemberId)}`,
        slug,
        token,
        { method: 'POST', body: data },
      );
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['club-members', slug, clubId] }); },
  });
}

export function useUpdateMemberRole(clubId: string, requestingMemberId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const token = await getToken();
      return apiCall<ClubMembershipItem>(
        `/clubs/${clubId}/members/${memberId}/role?requestingMemberId=${encodeURIComponent(requestingMemberId)}`,
        slug,
        token,
        { method: 'PATCH', body: { role } },
      );
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['club-members', slug, clubId] }); },
  });
}

export function useRemoveClubMember(clubId: string, requestingMemberId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const token = await getToken();
      return apiCall(
        `/clubs/${clubId}/members/${memberId}?requestingMemberId=${encodeURIComponent(requestingMemberId)}`,
        slug,
        token,
        { method: 'DELETE' },
      );
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['club-members', slug, clubId] }); },
  });
}

export function useTransferLeadership(clubId: string, currentLeaderId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newLeaderId: string) => {
      const token = await getToken();
      return apiCall(
        `/clubs/${clubId}/transfer-leadership?currentLeaderId=${encodeURIComponent(currentLeaderId)}`,
        slug,
        token,
        { method: 'POST', body: { newLeaderId } },
      );
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['club-members', slug, clubId] }); },
  });
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export function useClubPosts(clubId: string, page = 1, limit = 20) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['club-posts', slug, clubId, page, limit],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaginatedResponse<ClubPost>>(
        `/clubs/${clubId}/posts`,
        slug,
        token,
        { params: { page, limit } },
      );
    },
    enabled: Boolean(slug) && Boolean(clubId),
  });
}

export function useCreatePost(clubId: string, memberId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePostInput) => {
      const token = await getToken();
      return apiCall<ClubPost>(
        `/clubs/${clubId}/posts?memberId=${encodeURIComponent(memberId)}`,
        slug,
        token,
        { method: 'POST', body: data },
      );
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['club-posts', slug, clubId] }); },
  });
}

export function useUpdatePost(clubId: string, postId: string, memberId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CreatePostInput>) => {
      const token = await getToken();
      return apiCall<ClubPost>(
        `/clubs/${clubId}/posts/${postId}?memberId=${encodeURIComponent(memberId)}`,
        slug,
        token,
        { method: 'PATCH', body: data },
      );
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['club-posts', slug, clubId] }); },
  });
}

export function useDeletePost(clubId: string, memberId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const token = await getToken();
      return apiCall(
        `/clubs/${clubId}/posts/${postId}?memberId=${encodeURIComponent(memberId)}`,
        slug,
        token,
        { method: 'DELETE' },
      );
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['club-posts', slug, clubId] }); },
  });
}

export function usePinPost(clubId: string, memberId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const token = await getToken();
      return apiCall<ClubPost>(
        `/clubs/${clubId}/posts/${postId}/pin?memberId=${encodeURIComponent(memberId)}`,
        slug,
        token,
        { method: 'PATCH', body: {} },
      );
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['club-posts', slug, clubId] }); },
  });
}

// ─── Comments ────────────────────────────────────────────────────────────────

export function usePostComments(clubId: string, postId: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['club-comments', slug, clubId, postId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<ClubPostComment[]>(
        `/clubs/${clubId}/posts/${postId}/comments`,
        slug,
        token,
      );
    },
    enabled: Boolean(slug) && Boolean(clubId) && Boolean(postId),
  });
}

export function useAddComment(clubId: string, postId: string, memberId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCommentInput) => {
      const token = await getToken();
      return apiCall<ClubPostComment>(
        `/clubs/${clubId}/posts/${postId}/comments?memberId=${encodeURIComponent(memberId)}`,
        slug,
        token,
        { method: 'POST', body: data },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['club-comments', slug, clubId, postId] });
      void qc.invalidateQueries({ queryKey: ['club-posts', slug, clubId] });
    },
  });
}

// ─── Events ───────────────────────────────────────────────────────────────────

export function useClubEvents(clubId: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['club-events', slug, clubId],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<ClubEventLink[]>(`/clubs/${clubId}/events`, slug, token);
    },
    enabled: Boolean(slug) && Boolean(clubId),
  });
}

export function useLinkEvent(clubId: string) {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const token = await getToken();
      return apiCall(`/clubs/${clubId}/events`, slug, token, {
        method: 'POST',
        body: { eventId },
      });
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['club-events', slug, clubId] }); },
  });
}
