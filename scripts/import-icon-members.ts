#!/usr/bin/env tsx
/**
 * One-off import of ICON's member roster CSV into Contacts + Households.
 *
 * CSV shape: one row per family unit (primary member), with optional
 * spouse and up to 3 children as inline columns (no email of their own,
 * so they can't become standalone Contact rows — the schema requires a
 * unique, non-null email per Contact). Spouse/child names+ages are kept
 * as structured metadata on the primary Contact and the Household name.
 *
 *   npm run icon:import -- --file=/Users/Sanjeev/icon/tmp/members_08-06-26.csv --dry-run
 *   npm run icon:import -- --file=/Users/Sanjeev/icon/tmp/members_08-06-26.csv --confirm
 */
import { config as loadEnv } from "dotenv";
import * as fs from "fs";
import { prisma } from "@/lib/prisma";
import { rowsFromCsvText, type CsvRow } from "@/lib/import/contact-roster";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    out[key] = value === undefined ? true : value;
  }
  return out;
}

function blank(v: string | undefined): boolean {
  const t = (v ?? "").trim();
  return t === "" || t === "No Entry" || t === "-";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function collectPhones(row: CsvRow): string | null {
  const phones: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    const v = row[`Phone - Number[${i}]`];
    if (!blank(v)) phones.push(v.trim());
  }
  return phones.length ? phones.join("; ") : null;
}

function collectAddress(row: CsvRow): string | null {
  const parts: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    const v = row[`Address - Address Details[${i}]`];
    if (!blank(v)) parts.push(v.trim());
  }
  return parts.length ? parts.join(", ") : null;
}

function collectChildren(row: CsvRow): Array<{ name: string; age: string | null }> {
  const children: Array<{ name: string; age: string | null }> = [];
  const pairs: Array<[string, string]> = [
    ["Child name", "Child age"],
    ["Child name 2", "Child Age 2"],
    ["Child name 3", "Child age 3"],
  ];
  for (const [nameKey, ageKey] of pairs) {
    const name = row[nameKey];
    if (!blank(name)) {
      const age = row[ageKey];
      children.push({ name: name.trim(), age: blank(age) ? null : age.trim() });
    }
  }
  return children;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const filePath = String(args.file ?? "");
  const dryRun = !Boolean(args.confirm);
  const tenantSlug = String(args.tenantSlug ?? "icon");

  if (!filePath) throw new Error("--file=<path to CSV> is required");
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error(`Tenant not found for slug=${tenantSlug}`);

  console.log(`Target: ${tenant.name} (${tenant.slug}, ${tenant.id})`);
  console.log(dryRun ? "Mode: DRY RUN (no writes)" : "Mode: APPLY");

  const text = fs.readFileSync(filePath, "utf8");
  const rows = rowsFromCsvText(text);
  console.log(`Rows read: ${rows.length}`);

  let created = 0;
  let updated = 0;
  let householdsCreated = 0;
  let skippedNoEmail = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    const firstName = (row["Profile - First Name"] ?? "").trim();
    const lastName = (row["Profile - Last Name"] ?? "").trim();
    const emailRaw = (row["Primary Email Address"] ?? "").trim().toLowerCase();
    const status = (row["Profile - Status"] ?? "").trim();

    if (blank(emailRaw) || !EMAIL_RE.test(emailRaw)) {
      skippedNoEmail += 1;
      errors.push(`Row ${line}: skipped, no valid email (${firstName} ${lastName})`);
      continue;
    }

    const phone = collectPhones(row);
    const address = collectAddress(row);
    const spouseName = row["Partner/Spouse name"];
    const hasSpouse = !blank(spouseName);
    const children = collectChildren(row);
    const isFamily = hasSpouse || children.length > 0;

    const originalMetadata: Record<string, unknown> = {
      importSource: "icon_roster_csv",
      rosterStatus: status || null,
      address,
      spouseName: hasSpouse ? spouseName.trim() : null,
      children: children.length ? children : null,
    };

    const tags = ["imported", "icon-roster-2026-08-06", isFamily ? "family-household" : "individual"];
    if (status === "Frozen") tags.push("frozen");

    if (dryRun) {
      const existing = await prisma.contact.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: emailRaw } },
        select: { id: true },
      });
      if (existing) updated += 1;
      else created += 1;
      if (isFamily) householdsCreated += 1;
      continue;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.contact.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: emailRaw } },
        select: { id: true, tags: true, householdId: true },
      });

      const mergedTags = [...new Set([...(existing?.tags ?? []), ...tags])];

      const contact = await tx.contact.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: emailRaw } },
        update: {
          firstName,
          lastName,
          phone,
          type: "MEMBER",
          source: "icon_roster_import",
          externalSource: "icon_roster_csv",
          importedAt: new Date(),
          originalMetadata,
          lastActivityAt: new Date(),
          lastActivitySummary: "Updated from ICON roster import",
          tags: mergedTags,
        },
        create: {
          tenantId: tenant.id,
          firstName,
          lastName,
          email: emailRaw,
          phone,
          type: "MEMBER",
          source: "icon_roster_import",
          externalSource: "icon_roster_csv",
          importedAt: new Date(),
          originalMetadata,
          lastActivityAt: new Date(),
          lastActivitySummary: "Imported from ICON roster",
          tags: mergedTags,
          notes: `ICON roster import. Imported ${new Date().toISOString().slice(0, 10)}.`,
        },
      });

      let householdId = existing?.householdId ?? null;
      if (isFamily && !householdId) {
        const household = await tx.household.create({
          data: {
            tenantId: tenant.id,
            name: `${lastName} Family`,
            payerContactId: contact.id,
          },
        });
        householdId = household.id;
        await tx.contact.update({ where: { id: contact.id }, data: { householdId } });
      }

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: "icon-roster-import-script",
          action: existing ? "UPDATE" : "CREATE",
          metadata: { entity: "Contact", contactId: contact.id, email: emailRaw, source: "icon_roster_import" },
        },
      });

      return { isNew: !existing, madeHousehold: isFamily && !existing?.householdId };
    });

    if (result.isNew) created += 1;
    else updated += 1;
    if (result.madeHousehold) householdsCreated += 1;
  }

  console.log("");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Households created: ${householdsCreated}`);
  console.log(`Skipped (no valid email): ${skippedNoEmail}`);
  if (errors.length) {
    console.log(`\nNotes (${errors.length}):`);
    for (const e of errors.slice(0, 20)) console.log(`  ${e}`);
    if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
  }
  console.log(dryRun ? "\nDry-run complete — no rows written" : "\nImport complete");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
