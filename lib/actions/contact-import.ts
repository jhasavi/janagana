import type { ContactImportPreset } from "@/lib/import/contact-roster";
import { runContactImportFromFile } from "@/lib/import/run-contact-import";
import { requireActiveTenantForActions, type TenantActionOptions } from "@/lib/tenant";

export async function importContactsFromSpreadsheet(
  input: {
    file: File;
    preset: ContactImportPreset;
    importTag?: string;
    dryRun?: boolean;
  },
  options?: TenantActionOptions,
) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  return runContactImportFromFile({
    tenantId: auth.context.tenant.id,
    actorUserId: auth.context.user.id,
    file: input.file,
    preset: input.preset,
    importTag: input.importTag,
    dryRun: input.dryRun,
  });
}
