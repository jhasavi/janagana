import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const membershipId = request.nextUrl.searchParams.get("membershipId")?.trim();
  if (!membershipId) {
    return NextResponse.json({ ok: false, error: "membershipId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      contact: { select: { firstName: true, lastName: true, email: true } },
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
    membershipId: membership.id,
    status: membership.status,
    tier: membership.tier.name,
    interval: membership.tier.interval,
    expiresAt: membership.expiresAt?.toISOString() ?? null,
    member: {
      name: `${membership.contact.firstName} ${membership.contact.lastName}`,
      email: membership.contact.email,
    },
    community: membership.tenant.name,
    tenantSlug: membership.tenant.slug,
  });
}
