import { NextRequest, NextResponse } from "next/server";
import { importContactsFromSpreadsheet } from "@/lib/actions/contact-import";
import { isSafeDashboardReturnPath } from "@/lib/tenant/redirect-with-tenant";
import { readTenantIdHintFromForm } from "@/lib/tenant/active-tenant-form";
import { isSameOriginMutationRequest } from "@/lib/security/same-origin";
import { requireExportTenant } from "@/lib/export/require-export-auth";

export const runtime = "nodejs";

/**
 * POST /api/import/contacts
 *
 * Multipart spreadsheet import — more reliable than server actions for file uploads on Vercel.
 */
export async function POST(req: NextRequest) {
  if (!isSameOriginMutationRequest(req)) {
    return NextResponse.redirect(
      new URL("/dashboard/members?openImport=1&error=Invalid%20request%20origin", req.url),
    );
  }

  const auth = await requireExportTenant();
  if (!auth.ok) {
    const dest = auth.status === 401 ? "/sign-in" : "/dashboard/members?openImport=1&error=No%20active%20tenant";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  const form = await req.formData();
  const file = form.get("file");
  const mode = String(form.get("mode") ?? "import");
  const preset = String(form.get("preset") ?? "generic");
  const importTag = String(form.get("importTag") ?? "");
  const tenantHint = readTenantIdHintFromForm(form);

  if (!(file instanceof File) || file.size === 0) {
    return redirectImport(req, tenantHint ?? auth.tenant.id, {
      openImport: true,
      error: "Choose a CSV or Excel file.",
    });
  }

  const validPreset = ["generic", "class_roster", "raklet"].includes(preset)
    ? (preset as "generic" | "class_roster" | "raklet")
    : "generic";

  const result = await importContactsFromSpreadsheet(
    {
      file,
      preset: validPreset,
      importTag,
      dryRun: mode === "preview",
    },
    { tenantIdHint: tenantHint },
  );

  if (!result.ok) {
    return redirectImport(req, tenantHint ?? auth.tenant.id, {
      openImport: true,
      error: result.error,
    });
  }

  const { tenantId, created, updated, skipped, dryRun, errors } = result.data;
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

  return redirectPersist(req, tenantId, `/dashboard/members?${params.toString()}`);
}

function redirectPersist(req: NextRequest, tenantId: string, returnTo: string) {
  const safeReturnTo = isSafeDashboardReturnPath(returnTo) ? returnTo : "/dashboard/members";
  const url = new URL("/api/select-tenant", req.url);
  url.searchParams.set("reason", "persist");
  url.searchParams.set("tenantId", tenantId);
  url.searchParams.set("returnTo", safeReturnTo);
  return NextResponse.redirect(url);
}

function redirectImport(
  req: NextRequest,
  tenantId: string,
  opts: { openImport?: boolean; error?: string },
) {
  const params = new URLSearchParams();
  if (opts.openImport) params.set("openImport", "1");
  if (opts.error) params.set("error", opts.error);
  return redirectPersist(req, tenantId, `/dashboard/members?${params.toString()}`);
}
