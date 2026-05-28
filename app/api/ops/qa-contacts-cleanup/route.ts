import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteQaContacts, findQaContacts } from "@/lib/ops/qa-contacts-cleanup";

export const runtime = "nodejs";

function authorized(req: NextRequest): boolean {
  if (process.env.ENABLE_QA_CONTACT_CLEANUP !== "true") {
    return false;
  }
  const token = process.env.QA_CONTACT_CLEANUP_TOKEN?.trim();
  if (!token) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${token}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const matches = await findQaContacts(prisma);

  return NextResponse.json({
    mode: "dry-run",
    count: matches.length,
    contacts: matches.map((c) => ({
      id: c.id,
      email: c.email,
      tenantSlug: c.tenant.slug,
      tenantName: c.tenant.name,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const confirm = req.nextUrl.searchParams.get("confirm") === "1";
  const matches = await findQaContacts(prisma);

  if (!confirm) {
    return NextResponse.json({
      error: "Pass ?confirm=1 to delete listed QA contacts only",
      count: matches.length,
      contacts: matches.map((c) => ({ email: c.email, tenantSlug: c.tenant.slug })),
    });
  }

  const deleted = await deleteQaContacts(prisma, matches);

  return NextResponse.json({
    mode: "deleted",
    count: deleted.length,
    deleted,
  });
}
