import type { TenantStatus } from "@prisma/client";

export type TenantMappingContext = {
  tenantStatus: TenantStatus;
  hasClerkMembership: boolean;
};

export function tenantStatusLabel(status: TenantStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "SUSPENDED":
      return "Suspended";
    case "PENDING":
      return "Pending setup";
    default:
      return String(status);
  }
}

export function tenantMappingStatusLabel(ctx: TenantMappingContext): string {
  if (ctx.tenantStatus === "SUSPENDED") {
    return "Suspended in JanaGana";
  }
  if (ctx.tenantStatus !== "ACTIVE") {
    return "Not active";
  }
  if (!ctx.hasClerkMembership) {
    return "Mapped but Clerk membership missing";
  }
  return "Mapped and active";
}
