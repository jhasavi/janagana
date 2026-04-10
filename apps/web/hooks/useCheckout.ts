'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiCall } from '@/lib/api';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import type { CreateCheckoutPayload } from '@/lib/types/payments';

function useApiContext() {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();
  return { getToken, slug: tenant?.slug ?? '' };
}

export function useCreateCheckout() {
  const { getToken, slug } = useApiContext();
  return useMutation({
    mutationFn: async (payload: CreateCheckoutPayload) => {
      const token = await getToken();
      return apiCall<{ url: string }>('/payments/create-checkout', slug, token, {
        body: payload,
      });
    },
    onSuccess: async (data) => {
      if (data.url) {
        window.location.assign(data.url);
      }
    },
  });
}
