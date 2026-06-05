import { tenantMappingStatusLabel, tenantStatusLabel } from "@/lib/tenant/mapping-labels";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  assert(tenantStatusLabel("ACTIVE") === "Active", "ACTIVE label");
  assert(tenantStatusLabel("SUSPENDED") === "Suspended", "SUSPENDED label");
  assert(
    tenantMappingStatusLabel({ tenantStatus: "ACTIVE", hasClerkMembership: true }) === "Mapped and active",
    "mapped active",
  );
  assert(
    tenantMappingStatusLabel({ tenantStatus: "ACTIVE", hasClerkMembership: false }) ===
      "Mapped but Clerk membership missing",
    "missing membership",
  );
  assert(
    tenantMappingStatusLabel({ tenantStatus: "SUSPENDED", hasClerkMembership: true }) === "Suspended in JanaGana",
    "suspended tenant",
  );

  console.log("tenant-resolution-contract: ok");
}

main();
