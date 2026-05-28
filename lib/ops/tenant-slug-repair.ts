import type { PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/utils";

export const CANONICAL_SLUG_BY_ORG_NAME: Record<string, string> = {
  "namaste boston": "namaste-boston",
  "the purple wings": "purple-wings",
};

export function normalizeOrgName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isClerkGeneratedSlug(slug: string): boolean {
  return /-\d{12,}$/.test(slug.trim().toLowerCase());
}

export function preferredPublicSlug(orgName: string, clerkSlug: string | null | undefined): string {
  const normalized = normalizeOrgName(orgName);
  if (CANONICAL_SLUG_BY_ORG_NAME[normalized]) {
    return CANONICAL_SLUG_BY_ORG_NAME[normalized];
  }
  const fromClerk = (clerkSlug ?? "").trim().toLowerCase();
  if (fromClerk && !isClerkGeneratedSlug(fromClerk) && /^[a-z0-9-]{2,60}$/.test(fromClerk)) {
    return fromClerk;
  }
  return slugify(orgName).slice(0, 60) || "organization";
}

export type TenantInventoryRow = {
  id: string;
  name: string;
  slug: string;
  clerkOrgId: string;
  createdAt: Date;
  counts: {
    contacts: number;
    events: number;
    registrations: number;
    tiers: number;
    auditLogs: number;
    admins: number;
  };
};

export async function loadTenantInventory(prisma: PrismaClient): Promise<TenantInventoryRow[]> {
  const rows = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      clerkOrgId: true,
      createdAt: true,
      _count: {
        select: {
          contacts: true,
          events: true,
          registrations: true,
          tiers: true,
          auditLogs: true,
          tenantAdmins: true,
        },
      },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    clerkOrgId: t.clerkOrgId,
    createdAt: t.createdAt,
    counts: {
      contacts: t._count.contacts,
      events: t._count.events,
      registrations: t._count.registrations,
      tiers: t._count.tiers,
      auditLogs: t._count.auditLogs,
      admins: t._count.tenantAdmins,
    },
  }));
}

function totalRecords(counts: TenantInventoryRow["counts"]): number {
  return counts.contacts + counts.events + counts.registrations + counts.tiers + counts.auditLogs + counts.admins;
}

export type RepairAction =
  | { type: "MERGE_INTO"; fromTenantId: string; fromSlug: string; toTenantId: string; toSlug: string; orgName: string }
  | { type: "RENAME_SLUG"; tenantId: string; from: string; to: string; orgName: string }
  | { type: "DELETE_EMPTY"; tenantId: string; slug: string; orgName: string };

export type RepairPlan = {
  inventory: TenantInventoryRow[];
  actions: RepairAction[];
  conflicts: string[];
};

export function buildRepairPlan(inventory: TenantInventoryRow[]): RepairPlan {
  const conflicts: string[] = [];
  const actions: RepairAction[] = [];
  const bySlug = new Map(inventory.map((t) => [t.slug, t]));
  const byId = new Map(inventory.map((t) => [t.id, t]));

  for (const [orgKey, canonicalSlug] of Object.entries(CANONICAL_SLUG_BY_ORG_NAME)) {
    const matches = inventory.filter((t) => normalizeOrgName(t.name) === orgKey);
    if (matches.length === 0) {
      conflicts.push(`No tenant found for org name "${orgKey}"`);
      continue;
    }

    const canonicalRow = bySlug.get(canonicalSlug);
    // Primary row: prefer Clerk long-slug row (admin-mapped), else canonical row, else single match
    let primary =
      matches.find((t) => isClerkGeneratedSlug(t.slug)) ??
      matches.find((t) => t.id === canonicalRow?.id) ??
      (matches.length === 1 ? matches[0] : undefined);

    if (!primary) {
      conflicts.push(`Ambiguous tenants for "${orgKey}": ${matches.map((t) => t.slug).join(", ")}`);
      continue;
    }

    const duplicateCanonical =
      canonicalRow && canonicalRow.id !== primary.id ? canonicalRow : undefined;

    if (duplicateCanonical) {
      actions.push({
        type: "MERGE_INTO",
        fromTenantId: duplicateCanonical.id,
        fromSlug: duplicateCanonical.slug,
        toTenantId: primary.id,
        toSlug: primary.slug,
        orgName: primary.name,
      });
    }

    if (primary.slug !== canonicalSlug) {
      const blocker = bySlug.get(canonicalSlug);
      if (blocker && blocker.id !== primary.id && !duplicateCanonical) {
        conflicts.push(
          `Cannot rename ${primary.slug} → ${canonicalSlug}; slug owned by ${blocker.name} (${blocker.id})`,
        );
        continue;
      }
      actions.push({
        type: "RENAME_SLUG",
        tenantId: primary.id,
        from: primary.slug,
        to: canonicalSlug,
        orgName: primary.name,
      });
    }
  }

  return { inventory, actions, conflicts };
}

async function mergeTenantData(
  prisma: PrismaClient,
  fromTenantId: string,
  toTenantId: string,
): Promise<{ mergedContacts: number; mergedEvents: number }> {
  let mergedContacts = 0;
  let mergedEvents = 0;

  const sourceContacts = await prisma.contact.findMany({ where: { tenantId: fromTenantId } });
  for (const contact of sourceContacts) {
    const existing = await prisma.contact.findUnique({
      where: { tenantId_email: { tenantId: toTenantId, email: contact.email } },
    });
    if (existing) {
      await prisma.eventRegistration.updateMany({
        where: { contactId: contact.id },
        data: { contactId: existing.id, tenantId: toTenantId },
      });
      await prisma.membership.updateMany({
        where: { contactId: contact.id },
        data: { contactId: existing.id, tenantId: toTenantId },
      });
      await prisma.contact.delete({ where: { id: contact.id } });
    } else {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { tenantId: toTenantId },
      });
      mergedContacts += 1;
    }
  }

  const sourceEvents = await prisma.event.findMany({ where: { tenantId: fromTenantId } });
  for (const event of sourceEvents) {
    let nextSlug = event.slug;
    const conflict = await prisma.event.findUnique({
      where: { tenantId_slug: { tenantId: toTenantId, slug: nextSlug } },
    });
    if (conflict) {
      nextSlug = `${event.slug}-migrated-${event.id.slice(-6)}`;
    }
    await prisma.event.update({
      where: { id: event.id },
      data: { tenantId: toTenantId, slug: nextSlug },
    });
    mergedEvents += 1;
  }

  await prisma.eventRegistration.updateMany({
    where: { tenantId: fromTenantId },
    data: { tenantId: toTenantId },
  });
  await prisma.membership.updateMany({ where: { tenantId: fromTenantId }, data: { tenantId: toTenantId } });
  await prisma.membershipTier.updateMany({ where: { tenantId: fromTenantId }, data: { tenantId: toTenantId } });
  await prisma.auditLog.updateMany({ where: { tenantId: fromTenantId }, data: { tenantId: toTenantId } });

  for (const admin of await prisma.tenantAdmin.findMany({ where: { tenantId: fromTenantId } })) {
    const exists = await prisma.tenantAdmin.findUnique({
      where: { tenantId_clerkUserId: { tenantId: toTenantId, clerkUserId: admin.clerkUserId } },
    });
    if (exists) {
      await prisma.tenantAdmin.delete({ where: { id: admin.id } });
    } else {
      await prisma.tenantAdmin.update({
        where: { id: admin.id },
        data: { tenantId: toTenantId },
      });
    }
  }

  return { mergedContacts, mergedEvents };
}

export type ApplyRepairResult = {
  applied: string[];
  inventoryAfter: TenantInventoryRow[];
};

export async function applyRepairPlan(
  prisma: PrismaClient,
  plan: RepairPlan,
  options: { confirm: boolean; actorUserId: string; deleteEmptyDuplicates: boolean },
): Promise<ApplyRepairResult> {
  if (plan.conflicts.length > 0) {
    throw new Error(`Repair blocked: ${plan.conflicts.join("; ")}`);
  }
  if (!options.confirm) {
    return { applied: [], inventoryAfter: plan.inventory };
  }

  const applied: string[] = [];

  for (const action of plan.actions) {
    if (action.type === "MERGE_INTO") {
      const stats = await mergeTenantData(prisma, action.fromTenantId, action.toTenantId);
      applied.push(
        `MERGE ${action.fromSlug} → ${action.toSlug} (contacts+${stats.mergedContacts}, events+${stats.mergedEvents})`,
      );
      await prisma.auditLog.create({
        data: {
          tenantId: action.toTenantId,
          actorUserId: options.actorUserId,
          action: "UPDATE",
          metadata: {
            entity: "Tenant",
            operation: "merge_duplicate_slug_tenant",
            fromTenantId: action.fromTenantId,
            fromSlug: action.fromSlug,
            stats,
          },
        },
      });
    }
  }

  for (const action of plan.actions) {
    if (action.type === "RENAME_SLUG") {
      await prisma.tenant.update({
        where: { id: action.tenantId },
        data: { slug: action.to },
      });
      applied.push(`RENAME ${action.orgName}: ${action.from} → ${action.to}`);
      await prisma.auditLog.create({
        data: {
          tenantId: action.tenantId,
          actorUserId: options.actorUserId,
          action: "UPDATE",
          metadata: {
            entity: "Tenant",
            field: "slug",
            from: action.from,
            to: action.to,
            source: "tenant-slug-repair",
          },
        },
      });
    }
  }

  if (options.deleteEmptyDuplicates) {
    const mergeSources = plan.actions
      .filter((a): a is Extract<RepairAction, { type: "MERGE_INTO" }> => a.type === "MERGE_INTO")
      .map((a) => a.fromTenantId);

    for (const tenantId of mergeSources) {
      const row = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          _count: {
            select: {
              contacts: true,
              events: true,
              registrations: true,
              tiers: true,
              auditLogs: true,
              tenantAdmins: true,
            },
          },
        },
      });
      if (!row) continue;
      const counts = {
        contacts: row._count.contacts,
        events: row._count.events,
        registrations: row._count.registrations,
        tiers: row._count.tiers,
        auditLogs: row._count.auditLogs,
        admins: row._count.tenantAdmins,
      };
      if (totalRecords(counts) > 0) {
        applied.push(`SKIP DELETE ${row.slug} (not empty)`);
        continue;
      }
      await prisma.tenant.delete({ where: { id: tenantId } });
      applied.push(`DELETE EMPTY tenant ${row.slug}`);
    }
  }

  const inventoryAfter = await loadTenantInventory(prisma);
  return { applied, inventoryAfter };
}

export function formatInventoryForLog(inventory: TenantInventoryRow[]): string[] {
  return inventory.map((t) => {
    const c = t.counts;
    return `${t.name} | slug=${t.slug} | id=${t.id.slice(0, 8)}… | clerk=${t.clerkOrgId.slice(0, 8)}… | contacts=${c.contacts} events=${c.events} regs=${c.registrations}`;
  });
}
