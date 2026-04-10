import React from 'react';
import { Permission } from '@orgflow/types';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGateProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // If true, requires all permissions; if false, requires any
  fallback?: React.ReactNode;
  children: React.ReactNode;
  role?: 'OWNER' | 'ADMIN' | 'STAFF' | 'READONLY'; // Optional role-based check
}

/**
 * PermissionGate component - conditionally renders children based on user permissions
 * 
 * @example
 * // Single permission check
 * <PermissionGate permission="members:delete">
 *   <DeleteMemberButton />
 * </PermissionGate>
 * 
 * @example
 * // Multiple permissions (any)
 * <PermissionGate permissions={['members:edit', 'members:delete']}>
 *   <MemberActions />
 * </PermissionGate>
 * 
 * @example
 * // Multiple permissions (all required)
 * <PermissionGate permissions={['events:create', 'events:edit']} requireAll>
 *   <EventManagement />
 * </PermissionGate>
 * 
 * @example
 * // With fallback
 * <PermissionGate permission="settings:manage_team" fallback={<AccessDenied />}>
 *   <TeamManagement />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
  role,
}: PermissionGateProps) {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    role: userRole,
    isLoading 
  } = usePermissions();

  // If still loading permissions, don't render anything yet
  if (isLoading) {
    return null;
  }

  // Role-based check (if specified)
  if (role && userRole !== role) {
    return <>{fallback}</>;
  }

  // Single permission check
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Multiple permissions check
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Higher-order component version of PermissionGate
 * 
 * @example
 * const ProtectedComponent = withPermission('members:delete')(DeleteMemberButton);
 */
export function withPermission(permission: Permission) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function WrappedComponent(props: P) {
      return (
        <PermissionGate permission={permission}>
          <Component {...props} />
        </PermissionGate>
      );
    };
  };
}

/**
 * Higher-order component for multiple permissions
 */
export function withPermissions(permissions: Permission[], requireAll = false) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function WrappedComponent(props: P) {
      return (
        <PermissionGate permissions={permissions} requireAll={requireAll}>
          <Component {...props} />
        </PermissionGate>
      );
    };
  };
}

/**
 * Component for showing access denied message
 */
export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <div className="mb-4 text-4xl"> Locked </div>
        <h3 className="mb-2 text-lg font-semibold">Access Denied</h3>
        <p className="text-muted-foreground">
          {message || "You don't have permission to access this feature."}
        </p>
      </div>
    </div>
  );
}

/**
 * Component for showing loading state while permissions are being checked
 */
export function PermissionLoading({ children }: { children: React.ReactNode }) {
  const { isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Checking permissions...</div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook-based permission check for conditional rendering
 * 
 * @example
 * function MyComponent() {
 *   const canDeleteMembers = useCan('members:delete');
 *   
 *   return (
 *     <div>
 *       {canDeleteMembers && <DeleteButton />}
 *     </div>
 *   );
 * }
 */
export function useCan(permission: Permission): boolean;
export function useCan(permissions: Permission[], requireAll?: boolean): boolean;
export function useCan(
  permissionOrPermissions: Permission | Permission[],
  requireAll = false
): boolean {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  if (Array.isArray(permissionOrPermissions)) {
    return requireAll
      ? hasAllPermissions(permissionOrPermissions)
      : hasAnyPermission(permissionOrPermissions);
  }

  return hasPermission(permissionOrPermissions);
}
