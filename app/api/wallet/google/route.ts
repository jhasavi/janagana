import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { googleWalletConfigured } from "@/lib/wallet/config";
import { buildGoogleWalletSaveUrl } from "@/lib/wallet/google-pass";
import { configuredAppUrl } from "@/lib/environment";
import { isPro } from "@/lib/plans/gate";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!googleWalletConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Google Wallet is not configured for this deployment." },
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
      tenant: { select: { name: true, plan: true } },
    },
  });

  if (!membership) {
    return NextResponse.json({ ok: false, error: "Membership not found" }, { status: 404 });
  }

  if (!isPro(membership.tenant)) {
    return NextResponse.json({ ok: false, error: "Google Wallet is a Pro feature." }, { status: 403 });
  }

  try {
    const saveUrl = buildGoogleWalletSaveUrl({
      membershipId: membership.id,
      organizationName: membership.tenant.name,
      tierName: membership.tier.name,
      memberName: `${membership.contact.firstName} ${membership.contact.lastName}`,
      verifyUrl: `${configuredAppUrl()}/api/membership-verify?token=${token}`,
    });

    return NextResponse.redirect(saveUrl);
  } catch (error) {
    console.error("GOOGLE_WALLET_PASS_GENERATION_FAILED", error);
    return NextResponse.json({ ok: false, error: "Failed to generate Google Wallet link" }, { status: 500 });
  }
}
