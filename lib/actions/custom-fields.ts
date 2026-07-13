"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { requireActiveTenantForActions, requireActiveTenantForWriteActions, type TenantActionOptions } from "@/lib/tenant";
import { MAX_CUSTOM_FIELDS } from "@/lib/custom-fields/shared";

const CustomFieldTypeSchema = z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"]);

const CustomFieldCreateSchema = z
  .object({
    label: z.string().trim().min(1).max(60),
    type: CustomFieldTypeSchema,
    options: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .strict();

/** Any signed-in tenant member can read definitions — needed to render contact forms, not PII itself. */
export async function listCustomFieldDefinitions() {
  const auth = await requireActiveTenantForActions();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error, data: [] as any[] };
  }

  const definitions = await prisma.customFieldDefinition.findMany({
    where: { tenantId: auth.context.tenant.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return { ok: true as const, data: definitions };
}

export async function createCustomFieldDefinition(input: unknown, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const parsed = CustomFieldCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid field input" };
  }

  const activeCount = await prisma.customFieldDefinition.count({
    where: { tenantId: auth.context.tenant.id, active: true },
  });
  if (activeCount >= MAX_CUSTOM_FIELDS) {
    return { ok: false as const, error: `You can have at most ${MAX_CUSTOM_FIELDS} custom fields. Deactivate one first.` };
  }

  const baseKey = slugify(parsed.data.label).replace(/-/g, "_") || "field";
  let key = baseKey;
  let suffix = 1;
  while (
    await prisma.customFieldDefinition.findUnique({
      where: { tenantId_key: { tenantId: auth.context.tenant.id, key } },
    })
  ) {
    suffix += 1;
    key = `${baseKey}_${suffix}`;
  }

  const options_ =
    parsed.data.type === "SELECT" && parsed.data.options
      ? parsed.data.options
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;

  const definition = await prisma.customFieldDefinition.create({
    data: {
      tenantId: auth.context.tenant.id,
      key,
      label: parsed.data.label,
      type: parsed.data.type,
      options: options_,
      sortOrder: activeCount,
    },
  });

  return { ok: true as const, data: definition };
}

export async function setCustomFieldDefinitionActive(
  definitionId: string,
  active: boolean,
  options?: TenantActionOptions,
) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const existing = await prisma.customFieldDefinition.findFirst({
    where: { id: definitionId, tenantId: auth.context.tenant.id },
  });
  if (!existing) {
    return { ok: false as const, error: "Field not found" };
  }

  if (active) {
    const activeCount = await prisma.customFieldDefinition.count({
      where: { tenantId: auth.context.tenant.id, active: true },
    });
    if (activeCount >= MAX_CUSTOM_FIELDS) {
      return { ok: false as const, error: `You can have at most ${MAX_CUSTOM_FIELDS} active custom fields.` };
    }
  }

  await prisma.customFieldDefinition.update({ where: { id: existing.id }, data: { active } });
  return { ok: true as const };
}

export async function deleteCustomFieldDefinition(definitionId: string, options?: TenantActionOptions) {
  const auth = await requireActiveTenantForWriteActions(options);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  const existing = await prisma.customFieldDefinition.findFirst({
    where: { id: definitionId, tenantId: auth.context.tenant.id },
  });
  if (!existing) {
    return { ok: false as const, error: "Field not found" };
  }

  await prisma.customFieldDefinition.delete({ where: { id: existing.id } });
  return { ok: true as const };
}
