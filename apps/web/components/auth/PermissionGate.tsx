'use client';

import * as React from 'react';
import { useUser } from '@clerk/nextjs';
import { getRoleFromPublicMetadata, hasPermission } from '@/lib/auth';
import type { Permission } from '@orgflow/types';

interface PermissionGateProps {
  permission: Permission | Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { user } = useUser();
  const role = getRoleFromPublicMetadata(user?.publicMetadata as Record<string, unknown> | null | undefined);
  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = permissions.some((permissionItem) => hasPermission(role, permissionItem));

  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
}
