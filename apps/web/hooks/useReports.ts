'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiCall } from '@/lib/api';
import type { ReportType, ReportFormat, ReportFilterParams, ImportResult, TemplateType } from '@/lib/types/reports';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

function buildUrl(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const url = new URL(`${BASE_URL}/api/v1${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export function useReports() {
  const { tenant } = useCurrentTenant();
  const { getToken } = useAuth();

  const sendReport = useCallback(async (type: ReportType, format: ReportFormat, filters: ReportFilterParams = {}) => {
    const token = await getToken();
    const url = buildUrl(`/reports/${type}/export`, { format, ...filters });
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-slug': tenant?.slug ?? '',
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Unable to generate report');
    }

    const blob = await res.blob();
    return blob;
  }, [getToken, tenant?.slug]);

  const downloadTemplate = useCallback(async (type: TemplateType) => {
    const token = await getToken();
    const url = buildUrl(`/reports/templates/${type}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-slug': tenant?.slug ?? '',
      },
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Unable to download template.');
    }
    return res.blob();
  }, [getToken, tenant?.slug]);

  const importRows = useCallback(async <T extends ImportResult>(type: 'members' | 'events', rows: unknown[], options?: Record<string, unknown>) => {
    const token = await getToken();
    return apiCall<T>(`/reports/import/${type}`, tenant?.slug ?? '', token, {
      method: 'POST',
      body: { rows, options },
    });
  }, [getToken, tenant?.slug]);

  return {
    sendReport,
    downloadTemplate,
    importRows,
  };
}
