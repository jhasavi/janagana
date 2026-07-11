#!/usr/bin/env tsx
/**
 * Contact update + tag/filter contract — test manager gate.
 *
 *   npm run test:contact-update
 */
import { readFileSync } from "fs";
import { join } from "path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { ContactUpdateSchema } from "@/lib/actions/contacts";
import { buildContactListWhere, contactExportHref } from "@/lib/contacts/list-filters";
import { formatContactTagsInput, parseContactTags } from "@/lib/contacts/tags";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const ROOT = process.cwd();
const PROFILE_PAGE = join(ROOT, "app", "dashboard", "members", "[contactId]", "page.tsx");
const MEMBERS_PAGE = join(ROOT, "app", "dashboard", "members", "page.tsx");

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function testStaticProfileEditContract() {
  const profile = readFileSync(PROFILE_PAGE, "utf8");
  const members = readFileSync(MEMBERS_PAGE, "utf8");

  assert(profile.includes("updateContactAction"), "Profile page must wire updateContactAction");
  assert(profile.includes("ContactEditForm"), "Profile page must render ContactEditForm");
  assert(profile.includes("ContactTagBadges"), "Profile page must render clickable tag badges");
  assert(profile.includes("CopyEmailButton"), "Profile page must include copy-email control");
  assert(profile.includes('success === "updated"'), "Profile page must show update success alert");
  assert(!profile.includes("updateContactAction") || profile.includes("deleteContactAction"), "Profile keeps delete action");

  assert(members.includes("contactExportHref"), "Members page must use filter-aware export");
  assert(members.includes('name="tag"'), "Members page must include tag filter");
  assert(members.includes("Clear all"), "Members page must offer clear-all filters");

  console.log("PASS contact profile edit static contract");
}

function testTagParsing() {
  assert(parseContactTags("volunteer, donor ,vip").join(",") === "volunteer,donor,vip", "parseContactTags splits CSV");
  assert(parseContactTags(["a", " b "]).length === 2, "parseContactTags accepts arrays");
  assert(parseContactTags("a,".repeat(20)).length === 12, "parseContactTags caps at 12");
  assert(formatContactTagsInput(["x", "y"]) === "x, y", "formatContactTagsInput joins for forms");
  console.log("PASS tag parsing helpers");
}

function testUpdateSchema() {
  const parsed = ContactUpdateSchema.safeParse({
    contactId: "c1",
    firstName: "Ada",
    lastName: "Lovelace",
    phone: "",
    type: "VOLUNTEER",
    notes: "Coordinator",
    tags: "volunteer, newsletter",
  });
  assert(parsed.success, "ContactUpdateSchema accepts valid payload");
  console.log("PASS ContactUpdateSchema");
}

function testListWhereTagFilter() {
  const where = buildContactListWhere("tenant-1", { tag: "raklet" });
  const json = JSON.stringify(where);
  assert(json.includes("raklet"), "tag filter must constrain tags array");
  assert(json.includes("tenant-1"), "tag filter must scope tenant");
  console.log("PASS buildContactListWhere tag filter");
}

function testExportHrefPreservesFilters() {
  const href = contactExportHref({ q: "jane", tag: "vip", source: "manual_admin" });
  assert(href.includes("q=jane"), "export href must include q");
  assert(href.includes("tag=vip"), "export href must include tag");
  assert(href.includes("source=manual_admin"), "export href must include source");
  console.log("PASS contactExportHref");
}

async function testContactUpdateRoundtrip() {
  const marker = `contact-update-${Date.now().toString(36)}`;
  const tenant = await prisma.tenant.create({
    data: {
      slug: `${marker}-tenant`,
      name: `Contact update ${marker}`,
      clerkOrgId: `dev_${marker}`,
      status: "ACTIVE",
    },
  });

  const contact = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Before",
      lastName: "Edit",
      email: `${marker}@crm.test`,
      type: "OTHER",
      source: "manual_admin",
      tags: ["manual-entry"],
      notes: "initial",
    },
  });

  const updated = await prisma.contact.update({
    where: { id: contact.id },
    data: {
      firstName: "After",
      lastName: "Saved",
      phone: "555-0100",
      type: "VOLUNTEER",
      notes: "updated notes",
      tags: parseContactTags("volunteer, newsletter"),
    },
  });

  assert(updated.firstName === "After", "firstName must update");
  assert(updated.tags.includes("volunteer"), "tags must update");
  assert(updated.phone === "555-0100", "phone must update");

  const where = buildContactListWhere(tenant.id, { tag: "volunteer" });
  const matches = await prisma.contact.count({ where });
  assert(matches === 1, "tag filter must find updated contact");

  const whereQ = buildContactListWhere(tenant.id, { q: "newsletter" });
  const matchesQ = await prisma.contact.count({ where: whereQ });
  assert(matchesQ === 1, "search q must match tag exact value");

  await prisma.contact.delete({ where: { id: contact.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });

  console.log("PASS contact update DB roundtrip");
}

async function main() {
  testStaticProfileEditContract();
  testTagParsing();
  testUpdateSchema();
  testListWhereTagFilter();
  testExportHrefPreservesFilters();
  await testContactUpdateRoundtrip();
  console.log("Contact update checks passed");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
