/**
 * Leading characters that spreadsheet apps (Excel, Sheets, LibreOffice) may
 * interpret as a formula. Exported cells hold user-supplied text (names, notes,
 * public form submissions), so neutralize them (OWASP "CSV injection").
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let raw = String(value);
  // Real numbers (e.g. negative amounts) are not injectable; keep them numeric.
  if (typeof value !== "number" && FORMULA_TRIGGER.test(raw)) {
    raw = `'${raw}`;
  }
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function rowsToCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return `${lines.join("\n")}\n`;
}
