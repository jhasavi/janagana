import { NextRequest, NextResponse } from "next/server";
import {
  contactImportMethodNotAllowed,
  handleContactImportPost,
} from "@/lib/import/contact-import-handler";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/import/contacts — documents the endpoint (not for importing).
 * Browsers opening this URL while signed in previously saw an unhelpful 405.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "contact-import",
    message: "POST multipart form from Dashboard → Contacts → Import spreadsheet.",
    allowedMethods: ["POST"],
  });
}

export async function HEAD() {
  return contactImportMethodNotAllowed();
}

export async function PUT() {
  return contactImportMethodNotAllowed();
}

export async function DELETE() {
  return contactImportMethodNotAllowed();
}

/**
 * POST /api/import/contacts
 *
 * Multipart spreadsheet import from the dashboard Contacts page.
 */
export async function POST(req: NextRequest) {
  try {
    return await handleContactImportPost(req);
  } catch (error) {
    console.error("IMPORT_CONTACTS_UNHANDLED", error);
    return NextResponse.redirect(
      new URL(
        "/dashboard/members?openImport=1&error=Import%20failed%20unexpectedly.%20Try%20CSV%20format%20or%20contact%20support.",
        req.url,
      ),
    );
  }
}
