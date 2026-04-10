'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import type { TenantContext } from '@/lib/tenant';

// ─── Context shape ────────────────────────────────────────────────────────────

interface TenantContextValue {
  tenant: TenantContext | null;
  isLoading: boolean;
}

const TenantCtx = createContext<TenantContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface TenantProviderProps {
  /** Tenant data resolved server-side and passed as a prop. */
  tenant: TenantContext | null;
  children: ReactNode;
}

/**
 * Wrap the app layout with TenantProvider after resolving the tenant
 * on the server. The value is synchronous — no client-side fetching needed.
 *
 * @example In app/layout.tsx:
 *   const tenant = await getCurrentTenant();
 *   <TenantProvider tenant={tenant}>...</TenantProvider>
 */
export function TenantProvider({ tenant, children }: TenantProviderProps) {
  return (
    <TenantCtx.Provider value={{ tenant, isLoading: false }}>
      {children}
    </TenantCtx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current tenant context.
 * Must be called inside a component that is a descendant of `TenantProvider`.
 */
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantCtx);
  if (ctx === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return ctx;
}
