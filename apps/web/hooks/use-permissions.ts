import { useQuery } from '@tanstack/react-query';
import { useClerk } from '@clerk/nextjs';
import { 
  Permission, 
  RoleType, 
  ROLE_PRESETS, 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions 
} from '@orgflow/types';

interface UsePermissionsOptions {
  tenantId?: string;
}

interface UsePermissionsReturn {
  permissions: Permission[];
  role: RoleType | null;
  isLoading: boolean;
  error: Error | null;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
}

export function usePermissions(options: UsePermissionsOptions = {}): UsePermissionsReturn {
  const { user } = useClerk();
  
  // In a real implementation, this would fetch from your API
  // For now, we'll simulate based on the user's metadata or default to staff
  const {
    data: userRoleData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-permissions', user?.id, options.tenantId],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Simulate API call to get user role and permissions
      // In production, this would be: GET /api/users/me/permissions?tenantId=xxx
      const mockUserRole = await simulateUserRoleFetch(user.id, options.tenantId);
      return mockUserRole;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const permissions = userRoleData?.permissions || [];
  const role = userRoleData?.role || null;

  const hasPermissionFn = (permission: Permission) => {
    return hasPermission(permissions, permission);
  };

  const hasAnyPermissionFn = (requiredPermissions: Permission[]) => {
    return hasAnyPermission(permissions, requiredPermissions);
  };

  const hasAllPermissionsFn = (requiredPermissions: Permission[]) => {
    return hasAllPermissions(permissions, requiredPermissions);
  };

  return {
    permissions,
    role,
    isLoading,
    error,
    hasPermission: hasPermissionFn,
    hasAnyPermission: hasAnyPermissionFn,
    hasAllPermissions: hasAllPermissionsFn,
    can: hasPermissionFn, // Alias for convenience
    canAny: hasAnyPermissionFn, // Alias for convenience
    canAll: hasAllPermissionsFn, // Alias for convenience
  };
}

// Mock function - replace with actual API call
async function simulateUserRoleFetch(userId: string, tenantId?: string): Promise<{
  role: RoleType;
  permissions: Permission[];
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // In a real implementation, you would:
  // 1. Call your API: GET /api/users/me/permissions?tenantId=xxx
  // 2. The API would return the user's role and custom permissions
  // 3. For custom roles, return the exact permission set
  // 4. For preset roles, you could return the role type and let the frontend resolve permissions
  
  // For demo purposes, we'll return different roles based on user ID
  const userHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const roleTypes: RoleType[] = ['OWNER', 'ADMIN', 'STAFF', 'READONLY'];
  const assignedRole = roleTypes[userHash % roleTypes.length];
  
  return {
    role: assignedRole,
    permissions: ROLE_PRESETS[assignedRole] || [],
  };
}

// Hook for checking a single permission
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

// Hook for checking multiple permissions (any)
export function useAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = usePermissions();
  return hasAnyPermission(permissions);
}

// Hook for checking multiple permissions (all)
export function useAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions } = usePermissions();
  return hasAllPermissions(permissions);
}
