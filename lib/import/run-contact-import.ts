import {
  assertImportFileSize,
  importContactsFromRows,
  rowsFromSpreadsheetBuffer,
  spreadsheetHeaderNames,
  validateImportSpreadsheet,
  type ContactImportPreset,
} from "@/lib/import/contact-roster";

const ALLOWED_EXTENSIONS = [".csv", ".txt", ".xlsx", ".xls"];

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

/**
 * Parse and upsert contacts from an uploaded spreadsheet.
 * Used by API routes — does not touch cookies (caller handles tenant context).
 */
export async function runContactImportFromFile(input: {
  tenantId: string;
  actorUserId: string;
  file: File;
  preset: ContactImportPreset;
  importTag?: string;
  dryRun?: boolean;
}) {
  const { tenantId, actorUserId, file, preset, importTag, dryRun = false } = input;

  if (!file || file.size === 0) {
    return { ok: false as const, error: "Choose a CSV or Excel file to import." };
  }

  const sizeError = assertImportFileSize(file.size);
  if (sizeError) {
    return { ok: false as const, error: sizeError };
  }

  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      ok: false as const,
      error: "Unsupported file type. Use .csv, .xlsx, or .xls (export from Excel or Raklet).",
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = rowsFromSpreadsheetBuffer(buffer, file.name);
    if (rows.length === 0) {
      return { ok: false as const, error: "No data rows found. Check that the first row has column headers." };
    }

    const validationError = validateImportSpreadsheet(rows);
    if (validationError) {
      return {
        ok: false as const,
        error: validationError,
        headers: spreadsheetHeaderNames(rows),
      };
    }

    const result = await importContactsFromRows({
      tenantId,
      actorUserId,
      rows,
      preset,
      importTag,
      fileLabel: file.name,
      dryRun,
    });

    return {
      ok: true as const,
      data: {
        ...result,
        tenantId,
        dryRun,
        headers: spreadsheetHeaderNames(rows),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown import error";
    return {
      ok: false as const,
      error: `Failed to read spreadsheet: ${message}. Try saving as CSV and import again.`,
    };
  }
}
