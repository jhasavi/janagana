import { pickActiveTenant } from "@/lib/tenant/pick-active-tenant";
import { isSafeDashboardReturnPath } from "@/lib/tenant/redirect-with-tenant";
import type { MappedTenant } from "@/lib/tenant/tenant-resolver";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function tenant(id: string, slug: string): MappedTenant {
  return {
    id,
    name: slug,
    slug,
    clerkOrgId: `org_${slug}`,
    status: "ACTIVE",
  };
}

function main() {
  const pw = tenant("tenant-pw", "purple-wings");
  const nb = tenant("tenant-nb", "namaste-boston");
  const both = [nb, pw];

  assert(pickActiveTenant(both, "tenant-pw", null)?.id === "tenant-pw", "cookie wins");
  assert(pickActiveTenant(both, "invalid", "tenant-nb")?.id === "tenant-nb", "form hint when cookie stale");
  assert(pickActiveTenant(both, null, "tenant-pw")?.id === "tenant-pw", "form hint without cookie");
  assert(pickActiveTenant(both, null, null) === null, "multi-tenant requires cookie or hint");
  assert(pickActiveTenant([pw], null, null)?.id === "tenant-pw", "single tenant auto-select");
  assert(pickActiveTenant([], "tenant-pw", "tenant-pw") === null, "no mapped tenants");

  assert(isSafeDashboardReturnPath("/dashboard/members?success=1"), "safe dashboard return");
  assert(!isSafeDashboardReturnPath("//evil.com/dashboard"), "block protocol-relative");
  assert(!isSafeDashboardReturnPath("https://evil.com"), "block absolute");

  console.log("multi-tenant-active-tenant: ok");
}

main();
