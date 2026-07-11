import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripeWebhookConfigured } from "@/lib/payments/stripe";

export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, unknown> = {
    ok: true,
    app: "janagana",
    at: new Date().toISOString(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (error) {
    checks.database = "error";
    checks.ok = false;
    checks.databaseError = error instanceof Error ? error.message : String(error);
  }

  checks.stripeWebhook = stripeWebhookConfigured() ? "configured" : "missing";
  checks.zeptomail = process.env.ZEPTOMAIL_TOKEN?.trim() && process.env.ZEPTOMAIL_FROM?.trim() ? "configured" : "missing";
  checks.cronSecret = process.env.CRON_SECRET?.trim() ? "configured" : "missing";
  checks.opsAlertWebhook = process.env.OPS_ALERT_WEBHOOK_URL?.trim() ? "configured" : "missing";

  const since = new Date();
  since.setHours(since.getHours() - 24);

  try {
    const [failedComms, failedPayments] = await Promise.all([
      prisma.communicationMessage.count({
        where: { status: "FAILED", createdAt: { gte: since } },
      }),
      prisma.paymentRecord.count({
        where: { status: "FAILED", createdAt: { gte: since } },
      }),
    ]);
    checks.failedCommunications24h = failedComms;
    checks.failedPayments24h = failedPayments;
    if (failedComms > 0 || failedPayments > 0) {
      checks.degraded = true;
    }
  } catch {
    checks.metrics = "unavailable";
  }

  const status = checks.ok ? 200 : 503;
  return NextResponse.json(checks, { status });
}
