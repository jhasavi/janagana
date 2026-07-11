import { NextRequest, NextResponse } from "next/server";
import { runRenewalReminderJob } from "@/lib/jobs/renewal-reminders";
import { emitOpsAlert } from "@/lib/ops/alert";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    // Local/manual invoke without secret (documented for npm run job only in prod)
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
    const result = await runRenewalReminderJob(prisma);
    if (result.queued === 0 && result.skipped === 0) {
      console.info("RENEWAL_CRON", { message: "no eligible memberships" });
    } else {
      console.info("RENEWAL_CRON", result);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("RENEWAL_CRON_FAILED", message);
    await emitOpsAlert({ kind: "renewal-cron", message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
