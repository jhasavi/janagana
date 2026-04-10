'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

const MEMBER_TOKEN_KEY = 'memberToken';
const MEMBER_ID_KEY = 'portalMemberId';

export interface MemberSessionPayload {
  token: string;
  memberId: string;
}

export function getStoredMemberToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(MEMBER_TOKEN_KEY);
}

export function getStoredMemberId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(MEMBER_ID_KEY);
}

export function saveMemberSession(token: string, memberId: string, maxAgeSeconds = 15 * 60) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MEMBER_TOKEN_KEY, token);
  window.localStorage.setItem(MEMBER_ID_KEY, memberId);
  document.cookie = `${MEMBER_TOKEN_KEY}=${token}; path=/; max-age=${maxAgeSeconds}; secure; samesite=lax`;
}

export function clearMemberSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(MEMBER_TOKEN_KEY);
  window.localStorage.removeItem(MEMBER_ID_KEY);
  document.cookie = `${MEMBER_TOKEN_KEY}=; path=/; max-age=0; secure; samesite=lax`;
}

export function useMemberAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    setToken(getStoredMemberToken());
    setMemberId(getStoredMemberId());
  }, []);

  return {
    token,
    memberId,
    saveSession: (session: MemberSessionPayload) => {
      saveMemberSession(session.token, session.memberId);
      setToken(session.token);
      setMemberId(session.memberId);
    },
    clearSession: () => {
      clearMemberSession();
      setToken(null);
      setMemberId(null);
    },
    isAuthenticated: Boolean(token),
  };
}

export function useApiToken() {
  const { getToken } = useAuth();
  const { token } = useMemberAuth();

  return {
    getToken: async () => {
      if (token) return token;
      return await getToken();
    },
    token,
  };
}
