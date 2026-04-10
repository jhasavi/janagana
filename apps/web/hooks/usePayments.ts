'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiCall } from '@/lib/api';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import type {
  PaymentRecord,
  PaymentStats,
  InvoiceRecord,
  ConnectStatus,
  CreateInvoicePayload,
  RefundPayload,
} from '@/lib/types/payments';

function useApiContext() {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();
  return { getToken, slug: tenant?.slug ?? '' };
}

export function usePaymentStats(from?: string, to?: string) {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['payment-stats', slug, from, to],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaymentStats>('/payments/stats', slug, token, { params: { from, to } });
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}

export function usePayments() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['payments', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<PaymentRecord[]>('/payments', slug, token);
    },
    enabled: Boolean(slug),
    staleTime: 30_000,
  });
}

export function useInvoices() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['invoices', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<InvoiceRecord[]>('/payments/invoices', slug, token);
    },
    enabled: Boolean(slug),
    staleTime: 30_000,
  });
}

export function useConnectStatus() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['stripe-connect', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<ConnectStatus>('/payments/connect/status', slug, token);
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}

export function useConnectOnboard() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiCall<{ url: string }>('/payments/connect/onboard', slug, token);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stripe-connect', slug] }),
  });
}

export function useBillingPortalUrl() {
  const { getToken, slug } = useApiContext();
  return useQuery({
    queryKey: ['billing-portal', slug],
    queryFn: async () => {
      const token = await getToken();
      return apiCall<{ url: string }>('/payments/portal-url', slug, token);
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}

export function useCreateInvoice() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload) => {
      const token = await getToken();
      return apiCall<InvoiceRecord>('/payments/create-invoice', slug, token, { body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices', slug] }),
  });
}

export function useSendInvoice() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const token = await getToken();
      return apiCall<{ sent: boolean }>(`/payments/invoice/${invoiceId}/send`, slug, token, { method: 'POST' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices', slug] }),
  });
}

export function useMarkInvoicePaid() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const token = await getToken();
      return apiCall<{ paid: boolean }>(`/payments/invoice/${invoiceId}/mark-paid`, slug, token, { method: 'POST' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices', slug] }),
  });
}

export function useRefundPayment() {
  const { getToken, slug } = useApiContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, amountCents, reason }: { paymentId: string; amountCents?: number; reason?: string }) => {
      const token = await getToken();
      return apiCall('/payments/refund/' + paymentId, slug, token, {
        method: 'POST',
        body: { amountCents, reason },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments', slug] }),
  });
}
