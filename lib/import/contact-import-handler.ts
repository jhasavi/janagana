import { NextRequest, NextResponse } from "next/server";
import { runContactImportFromFile } from "@/lib/import/run-contact-import";
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_REQUEST_BYTES,
  type ContactImportPreset,
} from "@/lib/import/contact-roster";
import { isSafeDashboardReturnPath } from "@/lib/tenant/redirect-with-tenant";
import { readTenantIdHintFromForm } from "@/lib/tenant/active-tenant-form";
import { applyActiveTenantCookieToResponse } from "@/lib/tenant/active-tenant-cookie";
import { isSameOriginMutationRequest } from "@/lib/security/same-origin";
import {
  requireActiveTenantForImport,
  type ActiveTenantActionContext,
  type ActiveTenantActionResult,
} from "@/lib/tenant/active-tenant-context";

export type ContactImportAuth = (
  options?: { tenantIdHint?: string },
) => Promise<ActiveTenantActionResult>;

const IMPORT_PAGE = "/dashboard/members/import";
const MEMBERS_PAGE = "/dashboard/members";

function uploadFromForm(form: FormData): File | null {
  const entry = form.get("file");
  if (!(entry instanceof File) || entry.size === 0) {
    return null;
  }
  return entry;
}

function redirectImport(
  req: NextRequest,
  tenantId: string | null,
  query: Record<string, string | boolean>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === true) params.set(key, "1");
    else if (value === false) continue;
    else if (value) params.set(key, value);
  }
  const returnTo = `${IMPORT_PAGE}?${params.toString()}`;
  const safeReturnTo = isSafeDashboardReturnPath(returnTo) ? returnTo : IMPORT_PAGE;
  const response = NextResponse.redirect(new URL(safeReturnTo, req.url));
  if (tenantId) {
    return applyActiveTenantCookieToResponse(response, tenantId);
  }
  return response;
}

function redirectMembersList(
  req: NextRequest,
  tenantId: string | null,
  query: Record<string, string | boolean>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === true) params.set(key, "1");
    else if (value === false) continue;
    else if (value) params.set(key, value);
  }
  const returnTo = `${MEMBERS_PAGE}?${params.toString()}`;
  const safeReturnTo = isSafeDashboardReturnPath(returnTo) ? returnTo : MEMBERS_PAGE;
  const response = NextResponse.redirect(new URL(safeReturnTo, req.url));
  if (tenantId) {
    return applyActiveTenantCookieToResponse(response, tenantId);
  }
  return response;
}

function sourceFilterForPreset(preset: ContactImportPreset): string {
  switch (preset) {
    case "raklet":
      return "dashboard_raklet_import";
    case "class_roster":
      return "tpw_class_import";
    default:
      return "dashboard_csv_import";
  }
}

/** Reject oversized uploads before buffering multipart body (when Content-Length is sent). */
export function rejectOversizedImportRequest(req: NextRequest): string | null {
  const raw = req.headers.get("content-length");
  if (!raw) {
    return null;
  }
  const length = Number.parseInt(raw, 10);
  if (!Number.isFinite(length) || length < 0) {
    return null;
  }
  if (length > MAX_IMPORT_REQUEST_BYTES) {
    return `File is too large (max ${MAX_IMPORT_FILE_BYTES / 1024 / 1024} MB).`;
  }
  return null;
}

async function parseImportForm(req: NextRequest) {
  try {
    return { ok: true as const, form: await req.formData() };
  } catch (error) {
    console.error("IMPORT_CONTACTS_FORM_PARSE_FAILED", error);
    return {
      ok: false as const,
      error:
        "Could not read the uploaded file. Save as CSV and try again, or use a smaller file.",
    };
  }
}

async function resolveImportAuth(
  resolveAuth: ContactImportAuth,
  tenantHint?: string,
): Promise<ActiveTenantActionResult> {
  return resolveAuth(tenantHint ? { tenantIdHint: tenantHint } : undefined);
}

function unauthenticatedRedirect(req: NextRequest) {
  return NextResponse.redirect(new URL("/sign-in", req.url));
}

function authFailureRedirect(
  req: NextRequest,
  auth: ActiveTenantActionResult & { ok: false },
  tenantHint?: string,
) {
  const message =
    auth.error === "No active tenant context"
      ? "No active tenant. Select your community and try again."
      : auth.error;
  return redirectImport(req, tenantHint ?? null, { error: message });
}

async function processImportForm(
  req: NextRequest,
  form: FormData,
  context: ActiveTenantActionContext,
) {
  const tenantId = context.tenant.id;
  const file = uploadFromForm(form);
  const mode = String(form.get("mode") ?? "import");
  const preset = String(form.get("preset") ?? "generic");
  const importTag = String(form.get("importTag") ?? "");

  if (!file) {
    return redirectImport(req, tenantId, {
      error: "Choose a CSV or Excel file.",
    });
  }

  const validPreset = ["generic", "class_roster", "raklet"].includes(preset)
    ? (preset as ContactImportPreset)
    : "generic";

  console.info("IMPORT_CONTACTS_START", {
    route: "/api/import/contacts",
    tenantId,
    fileName: file.name,
    fileSize: file.size,
    mode,
    preset: validPreset,
  });

  let result;
  try {
    result = await runContactImportFromFile({
      tenantId,
      actorUserId: context.user.id,
      file,
      preset: validPreset,
      importTag,
      dryRun: mode === "preview",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown import error";
    console.error("IMPORT_CONTACTS_FAILED", {
      route: "/api/import/contacts",
      tenantId,
      fileName: file.name,
      fileSize: file.size,
      error: message.slice(0, 200),
    });
    return redirectImport(req, tenantId, {
      error: "Import failed unexpectedly. Try CSV format or contact support.",
    });
  }

  if (!result.ok) {
    console.error("IMPORT_CONTACTS_FAILED", {
      route: "/api/import/contacts",
      tenantId,
      fileName: file.name,
      fileSize: file.size,
      headerNames: "headers" in result ? result.headers : [],
      error: result.error.slice(0, 200),
    });
    return redirectImport(req, tenantId, {
      error: result.error,
    });
  }

  const { created, updated, skipped, dryRun, errors, headers } = result.data;
  console.info("IMPORT_CONTACTS_OK", {
    route: "/api/import/contacts",
    tenantId,
    fileName: file.name,
    fileSize: file.size,
    headerNames: headers,
    created,
    updated,
    skipped,
    errorCount: errors.length,
  });

  if (dryRun) {
    const query: Record<string, string | boolean> = {
      importPreview: true,
      importCreated: String(created),
      importUpdated: String(updated),
      importSkipped: String(skipped),
    };
    if (errors.length > 0) {
      query.importErrors = errors.slice(0, 3).join(" | ");
    }
    return redirectImport(req, tenantId, query);
  }

  const query: Record<string, string | boolean> = {
    success: "import",
    importCreated: String(created),
    importUpdated: String(updated),
    importSkipped: String(skipped),
    source: sourceFilterForPreset(validPreset),
  };
  if (errors.length > 0) {
    query.importErrors = errors.slice(0, 3).join(" | ");
  }

  return redirectMembersList(req, tenantId, query);
}

/**
 * Core POST handler for dashboard spreadsheet import.
 * Extracted for regression tests (injectable auth).
 *
 * Order: same-origin → Content-Length guard → auth → formData (never before auth).
 */
export async function handleContactImportPost(
  req: NextRequest,
  resolveAuth: ContactImportAuth = requireActiveTenantForImport,
) {
  if (!isSameOriginMutationRequest(req)) {
    return redirectImport(req, null, {
      error: "Invalid request origin. Refresh the page and try again.",
    });
  }

  const oversizeError = rejectOversizedImportRequest(req);
  if (oversizeError) {
    return redirectImport(req, null, { error: oversizeError });
  }

  const initialAuth = await resolveImportAuth(resolveAuth);
  if (!initialAuth.ok) {
    if (initialAuth.error === "Not authenticated") {
      return unauthenticatedRedirect(req);
    }

    const parsed = await parseImportForm(req);
    if (!parsed.ok) {
      return redirectImport(req, null, { error: parsed.error });
    }

    const tenantHint = readTenantIdHintFromForm(parsed.form);
    const hintedAuth = await resolveImportAuth(resolveAuth, tenantHint);
    if (!hintedAuth.ok) {
      if (hintedAuth.error === "Not authenticated") {
        return unauthenticatedRedirect(req);
      }
      return authFailureRedirect(req, hintedAuth, tenantHint);
    }

    return processImportForm(req, parsed.form, hintedAuth.context);
  }

  const parsed = await parseImportForm(req);
  if (!parsed.ok) {
    return redirectImport(req, initialAuth.context.tenant.id, {
      error: parsed.error,
    });
  }

  return processImportForm(req, parsed.form, initialAuth.context);
}

export function contactImportMethodNotAllowed() {
  return NextResponse.json(
    {
      ok: false,
      error: "Method not allowed",
      message: "Contact import accepts POST only. Use Dashboard → Contacts → Import spreadsheet.",
      allowedMethods: ["POST"],
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}
