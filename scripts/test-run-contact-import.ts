#!/usr/bin/env tsx
/**
 * Unit test for spreadsheet import pipeline (no DB — dry-run against template).
 * Full DB test: npm run test:import:db (requires DATABASE_URL).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { rowsFromSpreadsheetBuffer } from "@/lib/import/contact-roster";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const templatePath = join(process.cwd(), "public", "templates", "contact-import-template.csv");
  const buffer = readFileSync(templatePath);
  const rows = rowsFromSpreadsheetBuffer(buffer, "contact-import-template.csv");

  assert(rows.length === 2, `Expected 2 data rows, got ${rows.length}`);
  assert(Boolean(rows[0]["Email Address"]), "Missing Email Address column");
  assert(rows[0]["Email Address"] === "jane@example.com", "Unexpected first email");

  console.log("run-contact-import parser ok", { rows: rows.length });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
