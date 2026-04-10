import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUploadDocument, UploadResponse } from '@/hooks/useUploads';
import { useAuth } from '@clerk/nextjs';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiUpload } from '@/lib/api';

jest.mock('@clerk/nextjs');
jest.mock('@/hooks/useCurrentTenant');
jest.mock('@/lib/api');

describe('useUploadDocument', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
      },
    });

    (useAuth as jest.Mock).mockReturnValue({
      getToken: jest.fn().mockResolvedValue('test-token'),
    });

    (useCurrentTenant as jest.Mock).mockReturnValue({
      tenant: { slug: 'test-tenant' },
    });
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('uploads a document successfully', async () => {
    const mockResponse: UploadResponse = { url: 'https://cdn.example.com/test.pdf', publicId: 'doc_123' };
    (apiUpload as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUploadDocument(), { wrapper });

    const file = new File(['file contents'], 'test.pdf', { type: 'application/pdf' });

    await waitFor(async () => {
      await result.current.mutateAsync(file);
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiUpload).toHaveBeenCalledWith(
      '/upload/document',
      'test-tenant',
      'test-token',
      expect.any(FormData),
      { folder: 'documents' },
    );
    expect(result.current.data).toEqual(mockResponse);
  });

  it('returns error state when upload fails', async () => {
    (apiUpload as jest.Mock).mockRejectedValue(new Error('Upload failed'));

    const { result } = renderHook(() => useUploadDocument('member-documents'), { wrapper });

    const file = new File(['file contents'], 'test.pdf', { type: 'application/pdf' });

    await waitFor(async () => {
      await result.current.mutateAsync(file).catch(() => {});
      expect(result.current.isError).toBe(true);
    });

    expect(apiUpload).toHaveBeenCalledWith(
      '/upload/document',
      'test-tenant',
      'test-token',
      expect.any(FormData),
      { folder: 'member-documents' },
    );
  });
});
