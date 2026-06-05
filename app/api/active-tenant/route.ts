import { activeTenantJsonResponse } from "@/lib/api/active-tenant-response";

/**
 * GET /api/active-tenant
 *
 * Returns the JanaGana tenant for the signed-in Clerk user (validated against
 * live Clerk org membership + ACTIVE tenant rows). Cookie is preference only.
 */
export async function GET() {
  return activeTenantJsonResponse();
}
