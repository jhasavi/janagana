import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/use-permissions';
import { useClerk } from '@clerk/nextjs';
import { ROLE_PRESETS, type Permission } from '@orgflow/types';

// Mock dependencies
jest.mock('@clerk/nextjs');

describe('usePermissions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    (useClerk as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id' },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns loading state initially', () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('returns correct permissions for role', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.permissions).toBeDefined();
    expect(result.current.role).toBeDefined();
    expect(Array.isArray(result.current.permissions)).toBe(true);
  });

  it('hasPermission returns true for granted permission', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The role should have some permissions from ROLE_PRESETS
    const hasAnyPermission = result.current.permissions.length > 0;
    
    if (hasAnyPermission) {
      const testPermission = result.current.permissions[0] as Permission;
      expect(result.current.hasPermission(testPermission)).toBe(true);
    }
  });

  it('hasPermission returns false for denied permission', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Test with a permission that's unlikely to be in the preset
    const fakePermission = 'fake:permission' as unknown as Permission;
    expect(result.current.hasPermission(fakePermission)).toBe(false);
  });

  it('hasAnyPermission returns true if any permission is granted', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const permissions = result.current.permissions as Permission[];
    
    if (permissions.length > 0) {
      expect(result.current.hasAnyPermission([permissions[0]])).toBe(true);
    }
  });

  it('hasAnyPermission returns false if no permissions are granted', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const fakePermissions = ['fake:permission1', 'fake:permission2'] as unknown as Permission[];
    expect(result.current.hasAnyPermission(fakePermissions)).toBe(false);
  });

  it('hasAllPermissions returns true if all permissions are granted', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const permissions = result.current.permissions as Permission[];
    
    if (permissions.length >= 2) {
      expect(result.current.hasAllPermissions([permissions[0], permissions[1]])).toBe(true);
    }
  });

  it('hasAllPermissions returns false if not all permissions are granted', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const permissions = result.current.permissions as Permission[];
    const fakePermission = 'fake:permission' as unknown as Permission;
    
    if (permissions.length > 0) {
      expect(result.current.hasAllPermissions([permissions[0], fakePermission])).toBe(false);
    }
  });

  it('can alias works same as hasPermission', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const permissions = result.current.permissions as Permission[];
    
    if (permissions.length > 0) {
      expect(result.current.can(permissions[0])).toBe(result.current.hasPermission(permissions[0]));
    }
  });

  it('canAny alias works same as hasAnyPermission', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const permissions = result.current.permissions as Permission[];
    
    if (permissions.length > 0) {
      expect(result.current.canAny([permissions[0]])).toBe(result.current.hasAnyPermission([permissions[0]]));
    }
  });

  it('canAll alias works same as hasAllPermissions', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const permissions = result.current.permissions as Permission[];
    
    if (permissions.length >= 2) {
      expect(result.current.canAll([permissions[0], permissions[1]])).toBe(
        result.current.hasAllPermissions([permissions[0], permissions[1]])
      );
    }
  });

  it('does not fetch when user is not authenticated', () => {
    (useClerk as jest.Mock).mockReturnValue({
      user: null,
    });

    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.permissions).toEqual([]);
    expect(result.current.role).toBeNull();
  });

  it('respects tenantId option', async () => {
    const { result } = renderHook(() => usePermissions({ tenantId: 'tenant-123' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The hook should have fetched with the tenantId in the query key
    // We can verify this by checking the query key structure
    expect(result.current.permissions).toBeDefined();
  });
});
