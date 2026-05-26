import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/**
 * POST /api/webhooks/clerk
 *
 * Handles Clerk organization events to keep the DB Tenant table in sync.
 *
 * SECURITY: All requests are verified via Svix signature.
 * We ONLY sync org name changes — we do NOT auto-create Tenants from webhooks.
 * Tenant creation is explicit via /onboarding/create-organization only.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "organization.updated") {
    const { id: clerkOrgId, name } = event.data as { id: string; name: string };
    await prisma.tenant.updateMany({
      where: { clerkOrgId },
      data: { name },
    });
  }

  // organization.deleted → suspend the tenant
  if (event.type === "organization.deleted") {
    const { id: clerkOrgId } = event.data as { id: string };
    await prisma.tenant.updateMany({
      where: { clerkOrgId },
      data: { status: "SUSPENDED" },
    });
  }

  return NextResponse.json({ received: true });
}
