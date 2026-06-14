import { ACTIVE_TENANT_FORM_FIELD } from "@/lib/tenant/active-tenant-form";

export function TenantScopeHiddenFields({ tenantId }: { tenantId: string }) {
  return <input type="hidden" name={ACTIVE_TENANT_FORM_FIELD} value={tenantId} />;
}
