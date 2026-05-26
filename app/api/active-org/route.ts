import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getTenantByClerkOrgId } from "@/lib/tenant";

/**
 * GET /api/active-org
 *
 * Returns the current tenant info based on the Clerk session's active org.
 * The Clerk session is the source of truth — NOT any cookie.
 */
export async function GET() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 });
  }

  const tenant = await getTenantByClerkOrgId(orgId);

  if (!tenant) {
    return NextResponse.json({ error: "No tenant found for this organization" }, { status: 404 });
  }

  return NextResponse.json({ tenant });
}
