import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  reconcileClerkTenants,
  suspendMissingClerkTenants,
} from "@/lib/ops/clerk-tenant-reconciliation";

export const runtime = "nodejs";

function authorized(req: NextRequest): boolean {
  if (process.env.ENABLE_CLERK_TENANT_RECONCILIATION !== "true") {
    return false;
  }

  const token = process.env.CLERK_TENANT_RECONCILIATION_TOKEN?.trim();
  if (!token) return false;

  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${token}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await reconcileClerkTenants(prisma);
  return NextResponse.json({
    mode: "dry-run",
    ok: result.ok,
    error: result.error,
    missingActiveTenantIds: result.missingActiveTenantIds,
    rows: result.rows,
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const confirm = req.nextUrl.searchParams.get("confirm") === "1";
  const result = await reconcileClerkTenants(prisma);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "reconciliation_failed" }, { status: 500 });
  }

  if (!confirm) {
    return NextResponse.json({
      mode: "dry-run",
      applied: [],
      missingActiveTenantIds: result.missingActiveTenantIds,
      rows: result.rows,
    });
  }

  const applied = await suspendMissingClerkTenants(
    prisma,
    result.missingActiveTenantIds,
    "ops:clerk-tenant-reconciliation",
  );

  return NextResponse.json({
    mode: "apply",
    applied,
    missingActiveTenantIds: result.missingActiveTenantIds,
  });
}
