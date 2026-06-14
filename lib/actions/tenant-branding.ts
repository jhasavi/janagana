"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveTenantForActions, type TenantActionOptions } from "@/lib/tenant";

const TenantBrandingSchema = z
  .object({
    publicTagline: z.string().trim().max(300).optional().or(z.literal("")),
    publicContactEmail: z.string().trim().email().optional().or(z.literal("")),
    publicContactPhone: z.string().trim().max(40).optional().or(z.literal("")),
    logoUrl: z.string().trim().url().optional().or(z.literal("")),
  })
  .strict();

export async function updateTenantBranding(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const parsed = TenantBrandingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid branding input" };
  }

  const tenant = await prisma.tenant.update({
    where: { id: auth.context.tenant.id },
    data: {
      publicTagline: parsed.data.publicTagline || null,
      publicContactEmail: parsed.data.publicContactEmail || null,
      publicContactPhone: parsed.data.publicContactPhone || null,
      logoUrl: parsed.data.logoUrl || null,
    },
    select: {
      id: true,
      publicTagline: true,
      publicContactEmail: true,
      publicContactPhone: true,
      logoUrl: true,
    },
  });

  return { ok: true as const, data: tenant };
}

export async function getTenantBranding(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      publicTagline: true,
      publicContactEmail: true,
      publicContactPhone: true,
      logoUrl: true,
    },
  });
}
