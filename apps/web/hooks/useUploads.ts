'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiUpload } from '@/lib/api';

export interface UploadResponse {
  url: string;
  publicId: string;
}

export function useUploadDocument(folder = 'documents') {
  const { getToken } = useAuth();
  const { tenant } = useCurrentTenant();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!tenant?.slug) {
        throw new Error('Tenant slug is required for uploads.');
      }

      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);

      return apiUpload<UploadResponse>('/upload/document', tenant.slug, token, formData, {
        folder,
      });
    },
  });
}
