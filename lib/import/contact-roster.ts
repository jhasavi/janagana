import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export type CsvRow = Record<string, string>;

export type ContactImportPreset = "generic" | "class_roster" | "raklet";

export type ContactImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  preview: Array<{ email: string; name: string; phone: string | null }>;
};

const MAX_IMPORT_ROWS = 2500;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const EMAIL_KEYS = ["Email Address", "email", "Email", "E-mail", "E-Mail", "email address"];
const NAME_KEYS = ["Name", "name", "Full Name", "full name", "Member Name"];
const FIRST_KEYS = ["First Name", "first_name", "FirstName", "first name", "Given Name"];
const LAST_KEYS = ["Last Name", "last_name", "LastName", "last name", "Family Name", "Surname"];
const PHONE_KEYS = ["Phone Numbers", "phone", "Phone", "Mobile", "Cell", "Phone Number", "phone number"];
const NUMBER_KEYS = ["#", "number", "No", "ID", "Member ID", "member id"];

/** Minimal RFC-style CSV parser (handles quoted fields and embedded newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      if (char === "\r") i += 1;
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  return rows;
}

function matrixToRows(matrix: string[][]): CsvRow[] {
  if (matrix.length < 2) return [];
  const headers = matrix[0].map((h) => String(h ?? "").trim());
  return matrix.slice(1).map((cells) => {
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      if (!header) return;
      row[header] = String(cells[index] ?? "").trim();
    });
    return row;
  });
}

export function rowsFromCsvText(text: string): CsvRow[] {
  return matrixToRows(parseCsv(text));
}

export function rowsFromSpreadsheetBuffer(buffer: Buffer, filename: string): CsvRow[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return rowsFromCsvText(buffer.toString("utf8"));
  }

  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  const normalized = matrix.map((row) => row.map((cell) => String(cell ?? "").trim()));
  return matrixToRows(normalized);
}

export function pickField(row: CsvRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value?.trim()) return value.trim();
  }
  const lowerMap = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]),
  );
  for (const key of keys) {
    const value = lowerMap[key.trim().toLowerCase()];
    if (value?.trim()) return value.trim();
  }
  return "";
}

export function splitRosterName(fullName: string, email: string, firstName?: string, lastName?: string) {
  if (firstName?.trim()) {
    return {
      firstName: firstName.trim(),
      lastName: lastName?.trim() || "Imported",
    };
  }

  const fallback = email.split("@")[0] || "Unknown";
  const cleaned = fullName.trim();
  if (cleaned.includes(",")) {
    const [last, first] = cleaned.split(",").map((part) => part.trim());
    return {
      firstName: first || fallback,
      lastName: last || "Imported",
    };
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? fallback,
    lastName: parts.slice(1).join(" ") || "Imported",
  };
}

export function normalizePhone(raw: string): string | null {
  const lines = raw
    .split(/\n/)
    .map((line) => line.replace(/^(Cell|Home|Work):\s*/i, "").trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return lines.join("; ").slice(0, 30);
}

function presetConfig(preset: ContactImportPreset, importTag: string) {
  switch (preset) {
    case "class_roster":
      return {
        source: "tpw_class_import",
        interestType: "CLASS_INTEREST",
        externalSource: "tpw_class_csv",
        baseTags: ["imported", "tpw-class", importTag || "class1"],
        importSource: "tpw_class_csv",
      };
    case "raklet":
      return {
        source: "dashboard_raklet_import",
        interestType: "IMPORTED_CONTACT",
        externalSource: "raklet_export",
        baseTags: ["imported", "raklet", ...(importTag ? [importTag] : [])],
        importSource: "raklet_export",
      };
    default:
      return {
        source: "dashboard_csv_import",
        interestType: "IMPORTED_CONTACT",
        externalSource: "spreadsheet_upload",
        baseTags: ["imported", ...(importTag ? [importTag] : [])],
        importSource: "dashboard_csv",
      };
  }
}

function rowToContactFields(row: CsvRow) {
  const email = pickField(row, EMAIL_KEYS).toLowerCase();
  const fullName = pickField(row, NAME_KEYS);
  const firstName = pickField(row, FIRST_KEYS);
  const lastName = pickField(row, LAST_KEYS);
  const { firstName: fn, lastName: ln } = splitRosterName(fullName, email, firstName, lastName);
  const phone = normalizePhone(pickField(row, PHONE_KEYS));
  const rosterNumber = pickField(row, NUMBER_KEYS);

  const originalMetadata: Prisma.JsonObject = {};
  for (const [key, value] of Object.entries(row)) {
    if (!value.trim()) continue;
    const normalizedKey = key.trim().toLowerCase();
    if (
      ["email", "e-mail", "name", "full name", "first name", "last name", "phone", "phone numbers", "mobile", "cell", "#", "number"].includes(
        normalizedKey,
      )
    ) {
      continue;
    }
    originalMetadata[key] = value;
  }

  return { email, firstName: fn, lastName: ln, phone, rosterNumber, originalMetadata };
}

export function assertImportFileSize(byteLength: number): string | null {
  if (byteLength <= 0) return "Choose a CSV or Excel file to import.";
  if (byteLength > MAX_FILE_BYTES) return `File is too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB).`;
  return null;
}

export async function importContactsFromRows(input: {
  tenantId: string;
  actorUserId: string;
  rows: CsvRow[];
  preset: ContactImportPreset;
  importTag?: string;
  fileLabel: string;
  dryRun?: boolean;
}): Promise<ContactImportResult> {
  const { tenantId, actorUserId, rows, preset, importTag = "", fileLabel, dryRun = false } = input;
  const config = presetConfig(preset, importTag.trim());
  const result: ContactImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    preview: [],
  };

  const capped = rows.slice(0, MAX_IMPORT_ROWS);
  if (rows.length > MAX_IMPORT_ROWS) {
    result.errors.push(`Only the first ${MAX_IMPORT_ROWS} rows were processed.`);
  }

  for (const [index, row] of capped.entries()) {
    const line = index + 2;
    const { email, firstName, lastName, phone, rosterNumber, originalMetadata } = rowToContactFields(row);

    if (!email) {
      result.skipped += 1;
      continue;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      result.errors.push(`Row ${line}: invalid email "${email}"`);
      result.skipped += 1;
      continue;
    }

    result.preview.push({
      email,
      name: `${firstName} ${lastName}`.trim(),
      phone,
    });

    if (dryRun) {
      const existing = await prisma.contact.findUnique({
        where: { tenantId_email: { tenantId, email } },
        select: { id: true },
      });
      if (existing) result.updated += 1;
      else result.created += 1;
      continue;
    }

    const metadata = {
      importSource: config.importSource,
      importTag: importTag || null,
      rosterNumber: rosterNumber || null,
      fileLabel,
      importedVia: "dashboard",
      ...originalMetadata,
    } satisfies Prisma.JsonObject;

    const existing = await prisma.contact.findUnique({
      where: { tenantId_email: { tenantId, email } },
      select: { id: true, tags: true },
    });

    const tags = [...new Set([...(existing?.tags ?? []), ...config.baseTags])];
    const summary = existing
      ? `Updated from spreadsheet import (${fileLabel})`
      : `Imported from spreadsheet (${fileLabel})`;

    const contact = await prisma.contact.upsert({
      where: { tenantId_email: { tenantId, email } },
      update: {
        firstName,
        lastName,
        phone,
        source: config.source,
        interestType: config.interestType,
        externalSource: config.externalSource,
        externalId: rosterNumber || null,
        importedAt: new Date(),
        originalMetadata: metadata,
        lastActivityAt: new Date(),
        lastActivitySummary: summary,
        tags,
      },
      create: {
        tenantId,
        firstName,
        lastName,
        email,
        phone,
        type: "OTHER",
        source: config.source,
        interestType: config.interestType,
        externalSource: config.externalSource,
        externalId: rosterNumber || null,
        importedAt: new Date(),
        originalMetadata: metadata,
        lastActivityAt: new Date(),
        lastActivitySummary: summary,
        tags,
        notes: `Spreadsheet import (${preset}). Imported ${new Date().toISOString().slice(0, 10)}.`,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: existing ? "UPDATE" : "CREATE",
        metadata: {
          entity: "Contact",
          source: config.source,
          contactId: contact.id,
          email,
          preset,
          fileLabel,
        },
      },
    });

    if (existing) result.updated += 1;
    else result.created += 1;
  }

  return result;
}
