/**
 * Non-server-action helpers shared by custom-field UI and actions.
 * Kept out of lib/actions/custom-fields.ts because a "use server" file may
 * only export async functions — no constants or sync helpers.
 */
export const MAX_CUSTOM_FIELDS = 3;

/** Build the stored customFieldValues JSON for a contact from raw form input, validated against active definitions. */
export function parseCustomFieldValuesFromForm(
  definitions: Array<{ key: string; type: string }>,
  formData: FormData,
): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};
  for (const def of definitions) {
    const raw = formData.get(`cf_${def.key}`);
    if (raw === null) continue;
    const text = String(raw).trim();
    if (!text) continue;
    if (def.type === "NUMBER") {
      const num = Number(text);
      if (!Number.isNaN(num)) values[def.key] = num;
    } else if (def.type === "BOOLEAN") {
      values[def.key] = text === "1" || text === "true";
    } else {
      values[def.key] = text.slice(0, 500);
    }
  }
  return values;
}
