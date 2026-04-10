import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMembers, useMember, useMemberStats } from '@/hooks/useMembers';
import { useAuth } from '@clerk/nextjs';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { apiCall } from '@/lib/api';
import type { MemberStatus } from '@/lib/types/member';

// Mock dependencies
jest.mock('@clerk/nextjs');
jest.mock('@/hooks/useCurrentTenant');
jest.mock('@/lib/api');

describe('useMembers', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
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
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns loading state initially', () => {
    (apiCall as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useMembers(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('returns data on success', async () => {
    const mockData = {
      data: [
        { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      ],
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    };

    (apiCall as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useMembers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(apiCall).toHaveBeenCalledWith('/members', 'test-tenant', 'test-token', {
      params: {},
    });
  });

  it('returns error state on failure', async () => {
    (apiCall as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useMembers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('API Error'));
  });

  it('passes filters to API call', async () => {
    const mockData = {
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    };

    (apiCall as jest.Mock).mockResolvedValue(mockData);

    const filters = { status: 'ACTIVE' as MemberStatus, search: 'John' };

    renderHook(() => useMembers(filters), { wrapper });

    await waitFor(() => {
      expect(apiCall).toHaveBeenCalledWith('/members', 'test-tenant', 'test-token', {
        params: filters,
      });
    });
  });

  it('does not fetch when tenant slug is missing', () => {
    (useCurrentTenant as jest.Mock).mockReturnValue({
      tenant: null,
    });

    const { result } = renderHook(() => useMembers(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(apiCall).not.toHaveBeenCalled();
  });
});

describe('useMember', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
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
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches single member by id', async () => {
    const mockMember = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      status: 'ACTIVE' as MemberStatus,
    };

    (apiCall as jest.Mock).mockResolvedValue(mockMember);

    const { result } = renderHook(() => useMember('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockMember);
    expect(apiCall).toHaveBeenCalledWith('/members/1', 'test-tenant', 'test-token');
  });

  it('does not fetch when member id is missing', () => {
    const { result } = renderHook(() => useMember(null), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(apiCall).not.toHaveBeenCalled();
  });
});

describe('useMemberStats', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
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
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches member statistics', async () => {
    const mockStats = {
      totalMembers: 100,
      activeMembers: 85,
      pendingMembers: 10,
      newThisMonth: 5,
      growthRate: 0.05,
      byTier: [],
    };

    (apiCall as jest.Mock).mockResolvedValue(mockStats);

    const { result } = renderHook(() => useMemberStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStats);
    expect(apiCall).toHaveBeenCalledWith('/members/stats', 'test-tenant', 'test-token');
  });
});
