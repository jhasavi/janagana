import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { verifyToken: token },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      tier: { select: { name: true, interval: true } },
      tenant: { select: { slug: true, name: true } },
    },
  });

  if (!membership) {
    return NextResponse.json({ ok: false, error: "Membership not found" }, { status: 404 });
  }

  const now = new Date();
  const expired = membership.expiresAt ? membership.expiresAt < now : false;
  const active = membership.status === "ACTIVE" && !expired;

  return NextResponse.json({
    ok: true,
    active,
    status: membership.status,
    tier: membership.tier.name,
    interval: membership.tier.interval,
    expiresAt: membership.expiresAt?.toISOString() ?? null,
    member: {
      name: `${membership.contact.firstName} ${membership.contact.lastName}`,
    },
    community: membership.tenant.name,
    tenantSlug: membership.tenant.slug,
  });
}
