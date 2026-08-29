import { NextRequest, NextResponse } from "next/server";
import { runRecomputeStaleLeadsJob } from "@/lib/jobs/recompute-stale-leads";
import { emitOpsAlert } from "@/lib/ops/alert";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runRecomputeStaleLeadsJob(prisma);
    console.info("RECOMPUTE_STALE_LEADS_CRON", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("RECOMPUTE_STALE_LEADS_CRON_FAILED", message);
    await emitOpsAlert({ kind: "recompute-stale-leads-cron", message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
