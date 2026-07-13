"use server";

import { prisma } from "@/lib/prisma";
import { requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";

export async function updateDirectoryEnabled(enabled: boolean, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const tenant = await prisma.tenant.update({
    where: { id: auth.context.tenant.id },
    data: { directoryEnabled: enabled },
    select: { id: true, directoryEnabled: true },
  });

  return { ok: true as const, data: tenant };
}
