"use server";

import { prisma } from "@/lib/prisma";
import { requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";
import { isPro, UPGRADE_REQUIRED_ERROR } from "@/lib/plans/gate";

export async function updateDirectoryEnabled(enabled: boolean, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }
  if (enabled && !isPro(auth.context.tenant)) {
    return { ok: false as const, error: UPGRADE_REQUIRED_ERROR, upgradeRequired: true as const };
  }

  const tenant = await prisma.tenant.update({
    where: { id: auth.context.tenant.id },
    data: { directoryEnabled: enabled },
    select: { id: true, directoryEnabled: true },
  });

  return { ok: true as const, data: tenant };
}
