import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  applyRepairPlan,
  buildRepairPlan,
  formatInventoryForLog,
  loadTenantInventory,
} from "@/lib/ops/tenant-slug-repair";

export const runtime = "nodejs";

function authorized(req: NextRequest): boolean {
  if (process.env.ENABLE_TENANT_SLUG_REPAIR !== "true") {
    return false;
  }
  const token = process.env.TENANT_SLUG_REPAIR_TOKEN?.trim();
  if (!token) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${token}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const inventory = await loadTenantInventory(prisma);
  const plan = buildRepairPlan(inventory);

  return NextResponse.json({
    mode: "dry-run",
    inventory: formatInventoryForLog(inventory),
    actions: plan.actions,
    conflicts: plan.conflicts,
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const confirm = req.nextUrl.searchParams.get("confirm") === "1";
  const deleteEmpty = req.nextUrl.searchParams.get("deleteEmpty") === "1";

  const inventory = await loadTenantInventory(prisma);
  const plan = buildRepairPlan(inventory);

  if (plan.conflicts.length > 0) {
    return NextResponse.json({ error: "blocked", conflicts: plan.conflicts }, { status: 409 });
  }

  const result = await applyRepairPlan(prisma, plan, {
    confirm,
    actorUserId: "ops:tenant-slug-repair",
    deleteEmptyDuplicates: deleteEmpty,
  });

  return NextResponse.json({
    mode: confirm ? "apply" : "dry-run",
    applied: result.applied,
    inventoryAfter: formatInventoryForLog(result.inventoryAfter),
    actions: plan.actions,
  });
}
