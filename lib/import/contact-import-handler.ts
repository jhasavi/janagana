import { NextRequest, NextResponse } from "next/server";
import { runContactImportFromFile } from "@/lib/import/run-contact-import";
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_REQUEST_BYTES,
} from "@/lib/import/contact-roster";
import { isSafeDashboardReturnPath } from "@/lib/tenant/redirect-with-tenant";
import { readTenantIdHintFromForm } from "@/lib/tenant/active-tenant-form";
import { applyActiveTenantCookieToResponse } from "@/lib/tenant/active-tenant-cookie";
import { isSameOriginMutationRequest } from "@/lib/security/same-origin";
import {
  requireActiveTenantForActions,
  type ActiveTenantActionContext,
  type ActiveTenantActionResult,
} from "@/lib/tenant/active-tenant-context";

export type ContactImportAuth = (
  options?: { tenantIdHint?: string },
) => Promise<ActiveTenantActionResult>;

function uploadFromForm(form: FormData): File | null {
  const entry = form.get("file");
  if (!(entry instanceof File) || entry.size === 0) {
    return null;
  }
  return entry;
}

function redirectMembers(
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
  const returnTo = `/dashboard/members?${params.toString()}`;
  const safeReturnTo = isSafeDashboardReturnPath(returnTo) ? returnTo : "/dashboard/members";
  const response = NextResponse.redirect(new URL(safeReturnTo, req.url));
  if (tenantId) {
    return applyActiveTenantCookieToResponse(response, tenantId);
  }
  return response;
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
  return redirectMembers(req, tenantHint ?? null, { openImport: true, error: message });
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
    return redirectMembers(req, tenantId, {
      openImport: true,
      error: "Choose a CSV or Excel file.",
    });
  }

  const validPreset = ["generic", "class_roster", "raklet"].includes(preset)
    ? (preset as "generic" | "class_roster" | "raklet")
    : "generic";

  const result = await runContactImportFromFile({
    tenantId,
    actorUserId: context.user.id,
    file,
    preset: validPreset,
    importTag,
    dryRun: mode === "preview",
  });

  if (!result.ok) {
    return redirectMembers(req, tenantId, {
      openImport: true,
      error: result.error,
    });
  }

  const { created, updated, skipped, dryRun, errors } = result.data;
  const query: Record<string, string | boolean> = {
    openImport: true,
    importCreated: String(created),
    importUpdated: String(updated),
    importSkipped: String(skipped),
  };
  if (dryRun) {
    query.importPreview = true;
  } else {
    query.success = "import";
  }
  if (errors.length > 0) {
    query.importErrors = errors.slice(0, 3).join(" | ");
  }

  return redirectMembers(req, tenantId, query);
}

/**
 * Core POST handler for dashboard spreadsheet import.
 * Extracted for regression tests (injectable auth).
 *
 * Order: same-origin → Content-Length guard → auth → formData (never before auth).
 */
export async function handleContactImportPost(
  req: NextRequest,
  resolveAuth: ContactImportAuth = requireActiveTenantForActions,
) {
  if (!isSameOriginMutationRequest(req)) {
    return redirectMembers(req, null, {
      openImport: true,
      error: "Invalid request origin. Refresh the page and try again.",
    });
  }

  const oversizeError = rejectOversizedImportRequest(req);
  if (oversizeError) {
    return redirectMembers(req, null, { openImport: true, error: oversizeError });
  }

  const initialAuth = await resolveImportAuth(resolveAuth);
  if (!initialAuth.ok) {
    if (initialAuth.error === "Not authenticated") {
      return unauthenticatedRedirect(req);
    }

    const parsed = await parseImportForm(req);
    if (!parsed.ok) {
      return redirectMembers(req, null, { openImport: true, error: parsed.error });
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
    return redirectMembers(req, initialAuth.context.tenant.id, {
      openImport: true,
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
