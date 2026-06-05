import { activeTenantJsonResponse } from "@/lib/api/active-tenant-response";

/**
 * @deprecated Use GET /api/active-tenant — "org" meant Clerk org; response is a Tenant.
 */
export async function GET() {
  const response = await activeTenantJsonResponse({
    deprecated: true,
    useInstead: "/api/active-tenant",
  });
  response.headers.set("Deprecation", "true");
  response.headers.set("Link", '</api/active-tenant>; rel="successor-version"');
  return response;
}
