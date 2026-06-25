import { NextRequest, NextResponse } from "next/server";
import { runContactImportFromFile } from "@/lib/import/run-contact-import";
import { isSafeDashboardReturnPath } from "@/lib/tenant/redirect-with-tenant";
import { readTenantIdHintFromForm } from "@/lib/tenant/active-tenant-form";
import { applyActiveTenantCookieToResponse } from "@/lib/tenant/active-tenant-cookie";
import { isSameOriginMutationRequest } from "@/lib/security/same-origin";
import { requireExportTenant } from "@/lib/export/require-export-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/import/contacts
 *
 * Multipart spreadsheet import — more reliable than server actions for file uploads on Vercel.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSameOriginMutationRequest(req)) {
      return redirectMembers(req, null, {
        openImport: true,
        error: "Invalid request origin. Refresh the page and try again.",
      });
    }

    const auth = await requireExportTenant();
    if (!auth.ok) {
      const dest =
        auth.status === 401
          ? "/sign-in"
          : "/dashboard/members?openImport=1&error=No%20active%20tenant";
      return NextResponse.redirect(new URL(dest, req.url));
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch (error) {
      console.error("IMPORT_CONTACTS_FORM_PARSE_FAILED", error);
      return redirectMembers(req, auth.tenant.id, {
        openImport: true,
        error:
          "Could not read the uploaded file. If the spreadsheet is large, save as CSV and try again.",
      });
    }

    const file = form.get("file");
    const mode = String(form.get("mode") ?? "import");
    const preset = String(form.get("preset") ?? "generic");
    const importTag = String(form.get("importTag") ?? "");
    const tenantHint = readTenantIdHintFromForm(form);
    const tenantId = tenantHint ?? auth.tenant.id;

    if (!(file instanceof File) || file.size === 0) {
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
      actorUserId: auth.user.id,
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
    const params = new URLSearchParams();
    if (dryRun) {
      params.set("importPreview", "1");
    } else {
      params.set("success", "import");
    }
    params.set("importCreated", String(created));
    params.set("importUpdated", String(updated));
    params.set("importSkipped", String(skipped));
    params.set("openImport", "1");
    if (errors.length > 0) {
      params.set("importErrors", errors.slice(0, 3).join(" | "));
    }

    return redirectMembers(req, tenantId, Object.fromEntries(params));
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
