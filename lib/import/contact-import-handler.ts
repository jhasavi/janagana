import { NextRequest, NextResponse } from "next/server";
import { runContactImportFromFile } from "@/lib/import/run-contact-import";
import { isSafeDashboardReturnPath } from "@/lib/tenant/redirect-with-tenant";
import { readTenantIdHintFromForm } from "@/lib/tenant/active-tenant-form";
import { applyActiveTenantCookieToResponse } from "@/lib/tenant/active-tenant-cookie";
import { isSameOriginMutationRequest } from "@/lib/security/same-origin";
import {
  requireActiveTenantForActions,
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

/**
 * Core POST handler for dashboard spreadsheet import.
 * Extracted for regression tests (injectable auth).
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch (error) {
    console.error("IMPORT_CONTACTS_FORM_PARSE_FAILED", error);
    return redirectMembers(req, null, {
      openImport: true,
      error:
        "Could not read the uploaded file. Save as CSV and try again, or use a smaller file.",
    });
  }

  const tenantHint = readTenantIdHintFromForm(form);
  const auth = await resolveAuth(tenantHint ? { tenantIdHint: tenantHint } : undefined);
  if (!auth.ok) {
    const message =
      auth.error === "Not authenticated"
        ? null
        : auth.error === "No active tenant context"
          ? "No active tenant. Select your community and try again."
          : auth.error;
    if (message) {
      return redirectMembers(req, tenantHint ?? null, { openImport: true, error: message });
    }
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const tenantId = auth.context.tenant.id;
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
    actorUserId: auth.context.user.id,
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
