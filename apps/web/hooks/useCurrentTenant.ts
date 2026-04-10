'use client';

import { useTenant } from '@/context/TenantContext';
import type { TenantContext } from '@/lib/tenant';

// ─── Return type ──────────────────────────────────────────────────────────────

interface UseCurrentTenantResult {
  tenant: TenantContext | null;
  isLoading: boolean;
  /** Convenience flag — true when a tenant has been resolved. */
  hasTenant: boolean;
  /** The tenant's primary brand colour, or a safe default. */
  primaryColor: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Client hook that exposes the current tenant resolved from the
 * nearest `TenantProvider`.
 *
 * @example
 *   const { tenant, primaryColor } = useCurrentTenant();
 */
export function useCurrentTenant(): UseCurrentTenantResult {
  const { tenant, isLoading } = useTenant();

  return {
    tenant,
    isLoading,
    hasTenant: tenant !== null,
    primaryColor: tenant?.primaryColor ?? '#2563EB',
  };
}
