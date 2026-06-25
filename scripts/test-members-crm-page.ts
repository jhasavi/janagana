#!/usr/bin/env tsx
/**
 * Members CRM page semantics — static contract + list payload smoke.
 *
 *   npm run test:members-crm
 */
import { readFileSync } from "fs";
import { join } from "path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { CONTACT_LIST_PAGE_SIZE } from "@/lib/actions/contacts";
import { CONTACT_QUICK_FILTERS } from "@/lib/pilot/contact-filters";
import { getVisibleCommunityOsNav, hideComingSoonNav } from "@/lib/pilot/dashboard-nav";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const ROOT = process.cwd();
const MEMBERS_PAGE = join(ROOT, "app", "dashboard", "members", "page.tsx");
const CRM_TABLE = join(ROOT, "components", "dashboard", "contacts-table.tsx");
const LONG_METADATA =
  "Imported from raklet-export-2024-full-backup.csv at 2024-11-15T08:30:00Z. " +
  "Original row notes: volunteer coordinator, prefers SMS, household of 4, legacy member ID RK-88421.";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function testStaticMembersPage() {
  const page = readFileSync(MEMBERS_PAGE, "utf8");
  const table = readFileSync(CRM_TABLE, "utf8");

  assert(page.includes("Contacts"), "Members page title must be Contacts");
  assert(page.includes("ContactsCrmTable"), "Members page must render ContactsCrmTable");
  assert(page.includes('href="/dashboard/members/import"'), "Import button must link to import page");
  assert(page.includes('href="/api/export/contacts"'), "Export CSV link must exist");
  assert(page.includes('href="/dashboard/members/new"'), "Add contact button must exist");
  assert(page.includes("CONTACT_QUICK_FILTERS"), "Quick filters must be wired");
  assert(
    page.includes('params.success === "import" ? "" : (params.source ?? "")'),
    "Success import must not auto-apply source filter (prevents 262-row RSC crash)",
  );
  assert(!page.includes("updateContactAction"), "List page must not embed per-row edit server actions");
  assert(!page.includes("deleteContactAction"), "List page must not embed per-row delete server actions");

  for (const header of ["Name", "Email", "Phone", "Type", "Source", "Membership", "Last activity", "Tags", "Actions"]) {
    assert(table.includes(header), `CRM table must include column header: ${header}`);
  }
  assert(!table.includes("contact.notes"), "CRM table must not render notes in list rows");
  assert(table.includes("+{extra}"), "Tags must show +N overflow");

  const filterLabels = CONTACT_QUICK_FILTERS.map((f) => f.label);
  for (const label of ["All", "Members", "Leads", "Imported", "Raklet", "No email", "Recent activity"]) {
    assert(filterLabels.includes(label), `Quick filter missing: ${label}`);
  }

  const nav = getVisibleCommunityOsNav();
  const visibleItems = nav.flatMap((group) => group.items);
  assert(hideComingSoonNav(), "Pilot default should hide coming-soon nav items");
  const comingSoon = visibleItems.filter((item) => item.status === "coming-soon");
  assert(comingSoon.length === 0, "Visible nav must not include coming-soon items");

  console.log("PASS members CRM static contract");
}

async function testImportedContactsListPayload() {
  const marker = `crm-smoke-${Date.now().toString(36)}`;
  const tenant = await prisma.tenant.create({
    data: {
      slug: `${marker}-tenant`,
      name: `CRM smoke ${marker}`,
      clerkOrgId: `dev_${marker}`,
      status: "ACTIVE",
    },
  });

  const rowCount = CONTACT_LIST_PAGE_SIZE + 5;
  await prisma.contact.createMany({
    data: Array.from({ length: rowCount }, (_, i) => ({
      tenantId: tenant.id,
      firstName: "Import",
      lastName: `User${i}`,
      email: `${marker}-${i}@crm.test`,
      type: "OTHER",
      source: "dashboard_raklet_import",
      tags: ["imported", "raklet"],
      notes: LONG_METADATA,
      lastActivitySummary: `Imported from raklet-export-2024-full-backup.csv row ${i + 1}`,
      importedAt: new Date(),
      lastActivityAt: new Date(),
    })),
  });

  const contacts = await prisma.contact.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }, { email: "asc" }],
    take: CONTACT_LIST_PAGE_SIZE,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      type: true,
      source: true,
      interestType: true,
      lastActivityAt: true,
      lastActivitySummary: true,
      tags: true,
      importedAt: true,
      createdAt: true,
      memberships: { where: { status: "ACTIVE" }, take: 1, select: { status: true, expiresAt: true, tier: { select: { name: true } } } },
      _count: { select: { registrations: true } },
    },
  });

  const total = await prisma.contact.count({ where: { tenantId: tenant.id } });
  assert(total === rowCount, `expected ${rowCount} contacts, got ${total}`);
  assert(contacts.length === CONTACT_LIST_PAGE_SIZE, "list query must cap at CONTACT_LIST_PAGE_SIZE");
  assert(contacts.every((c) => c.tags.includes("imported")), "imported tags must be present");
  assert(contacts.every((c) => !("notes" in c)), "list select must not include notes field");

  await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });

  console.log(`PASS imported contacts list payload (${rowCount} rows, capped at ${CONTACT_LIST_PAGE_SIZE})`);
}

async function main() {
  testStaticMembersPage();
  await testImportedContactsListPayload();
  console.log("Members CRM page checks passed");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
