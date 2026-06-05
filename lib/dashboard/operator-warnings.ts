import type { TenantStatus } from "@prisma/client";
import type { TenantResolutionResult } from "@/lib/tenant/tenant-resolver";
import { tenantMappingStatusLabel } from "@/lib/tenant/mapping-labels";

export type OperatorWarning = {
  id: string;
  severity: "critical" | "attention" | "info";
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

export function buildMappingWarnings(input: {
  tenantStatus: TenantStatus;
  hasClerkMembership: boolean;
  resolution: TenantResolutionResult;
}): OperatorWarning[] {
  const warnings: OperatorWarning[] = [];

  if (input.resolution.staleCookieIgnored) {
    warnings.push({
      id: "stale-cookie",
      severity: "attention",
      message: "Your saved community preference was out of date and was cleared. You are on the correct tenant now.",
    });
  }

  if (input.tenantStatus === "SUSPENDED") {
    warnings.push({
      id: "tenant-suspended",
      severity: "critical",
      message: "This community is suspended in JanaGana. Public portal and new captures may be blocked.",
      actionLabel: "View mapping diagnostics",
      actionHref: "/dashboard/settings",
    });
  } else if (!input.hasClerkMembership) {
    warnings.push({
      id: "clerk-membership-missing",
      severity: "critical",
      message: tenantMappingStatusLabel({
        tenantStatus: input.tenantStatus,
        hasClerkMembership: false,
      }),
      actionLabel: "View mapping diagnostics",
      actionHref: "/dashboard/settings",
    });
  }

  return warnings;
}

export function mergeOperatorWarnings(
  mapping: OperatorWarning[],
  operational: OperatorWarning[],
): OperatorWarning[] {
  const seen = new Set<string>();
  const merged: OperatorWarning[] = [];
  for (const warning of [...mapping, ...operational]) {
    if (seen.has(warning.id)) continue;
    seen.add(warning.id);
    merged.push(warning);
  }
  return merged;
}
