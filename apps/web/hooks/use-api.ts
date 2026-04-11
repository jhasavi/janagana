'use client';

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import apiClient, { isColdStartError, getErrorMessage } from '@/lib/api-client';
import { useApiLoading } from '@/components/common/ApiLoadingState';

/**
 * React Query wrapper for API calls with cold-start handling
 * 
 * Features:
 * - Includes the cold-start handling
 * - Shows ApiLoadingState during long requests
 * - Has proper error states
 * - Reuses the centralized api-client
 */

// Generic GET hook
export function useApiGet<T>(
  queryKey: string[],
  url: string,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  const { isLoading, startLoading, stopLoading } = useApiLoading();

  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      startLoading();
      try {
        const response = await apiClient.get<T>(url);
        return response.data;
      } finally {
        stopLoading();
      }
    },
    ...options,
  });
}

// Generic POST hook
export function useApiPost<TData, TResponse>(
  url: string,
  options?: UseMutationOptions<TResponse, Error, TData>
) {
  const { isLoading, startLoading, stopLoading } = useApiLoading();

  return useMutation<TResponse, Error, TData>({
    mutationFn: async (data: TData) => {
      startLoading();
      try {
        const response = await apiClient.post<TResponse>(url, data);
        return response.data;
      } finally {
        stopLoading();
      }
    },
    ...options,
  });
}

// Generic PUT hook
export function useApiPut<TData, TResponse>(
  url: string,
  options?: UseMutationOptions<TResponse, Error, TData>
) {
  const { isLoading, startLoading, stopLoading } = useApiLoading();

  return useMutation<TResponse, Error, TData>({
    mutationFn: async (data: TData) => {
      startLoading();
      try {
        const response = await apiClient.put<TResponse>(url, data);
        return response.data;
      } finally {
        stopLoading();
      }
    },
    ...options,
  });
}

// Generic DELETE hook
export function useApiDelete<TResponse>(
  url: string,
  options?: UseMutationOptions<TResponse, Error, void>
) {
  const { isLoading, startLoading, stopLoading } = useApiLoading();

  return useMutation<TResponse, Error, void>({
    mutationFn: async () => {
      startLoading();
      try {
        const response = await apiClient.delete<TResponse>(url);
        return response.data;
      } finally {
        stopLoading();
      }
    },
    ...options,
  });
}

// Generic PATCH hook
export function useApiPatch<TData, TResponse>(
  url: string,
  options?: UseMutationOptions<TResponse, Error, TData>
) {
  const { isLoading, startLoading, stopLoading } = useApiLoading();

  return useMutation<TResponse, Error, TData>({
    mutationFn: async (data: TData) => {
      startLoading();
      try {
        const response = await apiClient.patch<TResponse>(url, data);
        return response.data;
      } finally {
        stopLoading();
      }
    },
    ...options,
  });
}

/**
 * Hook for API health check
 */
export function useApiHealth() {
  return useApiGet<{ status: string; timestamp: string }>(
    ['health'],
    '/health/live',
    {
      refetchInterval: 30000, // Poll every 30 seconds
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );
}

/**
 * Hook for tenant data
 */
export function useTenant(slug?: string) {
  return useApiGet<any>(
    ['tenant', slug],
    slug ? `/tenants/${slug}` : '',
    {
      enabled: !!slug,
    }
  );
}

/**
 * Hook for organizations
 */
export function useOrganizations() {
  return useApiGet<any[]>(['organizations'], '/organizations');
}

/**
 * Hook for members
 */
export function useMembers(organizationId?: string) {
  return useApiGet<any[]>(
    ['members', organizationId],
    organizationId ? `/organizations/${organizationId}/members` : '',
    {
      enabled: !!organizationId,
    }
  );
}

/**
 * Hook for events
 */
export function useEvents(organizationId?: string) {
  return useApiGet<any[]>(
    ['events', organizationId],
    organizationId ? `/organizations/${organizationId}/events` : '',
    {
      enabled: !!organizationId,
    }
  );
}

/**
 * Hook for volunteers
 */
export function useVolunteers(organizationId?: string) {
  return useApiGet<any[]>(
    ['volunteers', organizationId],
    organizationId ? `/organizations/${organizationId}/volunteers` : '',
    {
      enabled: !!organizationId,
    }
  );
}

/**
 * Hook for payments
 */
export function usePayments(organizationId?: string) {
  return useApiGet<any[]>(
    ['payments', organizationId],
    organizationId ? `/organizations/${organizationId}/payments` : '',
    {
      enabled: !!organizationId,
    }
  );
}

// Export the loading state hook for use in components
export { useApiLoading };
