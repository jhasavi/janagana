'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { useAuth } from '@clerk/nextjs';
import { apiCall } from '@/lib/api';
import type { AuditLogResponse } from '@/lib/types/audit';

export function useAuditLogs(filters: Record<string, string | number | undefined>) {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();

  return useQuery({
    queryKey: ['audit-logs', tenant?.slug, filters],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<AuditLogResponse>('/audit/logs', tenant?.slug ?? '', token, {
        params: filters,
      });
    },
    enabled: Boolean(tenant?.slug),
    staleTime: 30 * 1000,
  });
}
