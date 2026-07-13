import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appleWalletConfigured } from "@/lib/wallet/config";
import { buildApplePass } from "@/lib/wallet/apple-pass";
import { configuredAppUrl } from "@/lib/environment";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!appleWalletConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Apple Wallet is not configured for this deployment." },
      { status: 501 },
    );
  }

  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { verifyToken: token },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      tier: { select: { name: true } },
      tenant: { select: { name: true, slug: true } },
    },
  });

  if (!membership) {
    return NextResponse.json({ ok: false, error: "Membership not found" }, { status: 404 });
  }

  try {
    const buffer = await buildApplePass({
      serialNumber: membership.id,
      organizationName: membership.tenant.name,
      tierName: membership.tier.name,
      memberName: `${membership.contact.firstName} ${membership.contact.lastName}`,
      verifyUrl: `${configuredAppUrl()}/api/membership-verify?token=${token}`,
      expiresAt: membership.expiresAt,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${membership.tenant.slug}-membership.pkpass"`,
      },
    });
  } catch (error) {
    console.error("APPLE_WALLET_PASS_GENERATION_FAILED", error);
    return NextResponse.json({ ok: false, error: "Failed to generate Apple Wallet pass" }, { status: 500 });
  }
}
