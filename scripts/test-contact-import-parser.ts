#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { join } from "path";
import { pickField, rowsFromCsvText } from "@/lib/import/contact-roster";

async function main() {
  const csvPath = join(process.cwd(), "data", "tpw-class1.csv");
  const rows = rowsFromCsvText(readFileSync(csvPath, "utf8"));
  const withEmail = rows.filter((row) => pickField(row, ["Email Address", "email"]));

  if (withEmail.length !== 11) {
    throw new Error(`Expected 11 rows with email, got ${withEmail.length}`);
  }

  const first = withEmail[0];
  const email = pickField(first, ["Email Address", "email"]).toLowerCase();
  if (!email.includes("@")) {
    throw new Error(`Expected valid email in first row, got ${email}`);
  }

  console.log("contact-import parser ok", { rows: withEmail.length, sample: email });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
