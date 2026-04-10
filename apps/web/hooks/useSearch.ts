'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { useAuth } from '@clerk/nextjs';
import { apiCall } from '@/lib/api';
import type { GlobalSearchResults } from '@/lib/types/search';

export function useGlobalSearch(query: string) {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();
  return useQuery({
    queryKey: ['global-search', tenant?.slug, query],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<GlobalSearchResults>('/search', tenant?.slug ?? '', token, {
        params: { q: query },
      });
    },
    enabled: Boolean(query?.trim()) && Boolean(tenant?.slug),
    staleTime: 2 * 60 * 1000,
  });
}
