/** Hidden field name on dashboard mutation forms — scopes server actions to the visible tenant. */
export const ACTIVE_TENANT_FORM_FIELD = "jgTenantId";

export function readTenantIdHintFromForm(formData: FormData): string | undefined {
  const value = String(formData.get(ACTIVE_TENANT_FORM_FIELD) ?? "").trim();
  return value || undefined;
}
