#!/usr/bin/env tsx
/**
 * Contact import regression suite.
 *
 * Verifies:
 * - UI form targets POST /api/import/contacts
 * - Route exports POST; GET is informational; other methods return 405
 * - Handler accepts multipart uploads and scopes tenant correctly
 * - Fixture CSV creates/updates/skips as expected
 * - Bad input returns handled errors (never throws)
 */
import { readFileSync } from "fs";
import { join } from "path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/import/contacts/route";
import {
  handleContactImportPost,
  rejectOversizedImportRequest,
  type ContactImportAuth,
} from "@/lib/import/contact-import-handler";
import { MAX_IMPORT_REQUEST_BYTES } from "@/lib/import/contact-roster";
import { runContactImportFromFile } from "@/lib/import/run-contact-import";
import {
  normalizeImportEmail,
  resolveImportEmail,
  rowsFromCsvText,
} from "@/lib/import/contact-roster";
import type { ActiveTenantActionResult } from "@/lib/tenant/active-tenant-context";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const TEST_PREFIX = "IMPORT_REGRESSION_";
const FIXTURE_PATH = join(process.cwd(), "fixtures", "contact-import-regression.csv");
const NB_FIXTURE_PATH = join(process.cwd(), "fixtures", "contact-import-real-world-nb.csv");
const MEMBERS_PAGE = join(process.cwd(), "app", "dashboard", "members", "page.tsx");

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function parseDatabaseUrl(raw: string | undefined) {
  if (!raw) return { host: "unknown", database: "unknown" };
  try {
    const url = new URL(raw);
    const pathname = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
    return { host: (url.hostname || "unknown").toLowerCase(), database: (pathname || "unknown").toLowerCase() };
  } catch {
    return { host: "unknown", database: "unknown" };
  }
}

function ensureSafeDb() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run contact-import regression with NODE_ENV=production");
  }
  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  const local = ["localhost", "127.0.0.1"].some((t) => parsed.host.includes(t));
  if (!local && process.env.ALLOW_DEV_DB_TESTS !== "true") {
    throw new Error(
      `Refusing to run against non-local DB (${parsed.host}). Set ALLOW_DEV_DB_TESTS=true if intentional.`,
    );
  }
}

async function cleanup() {
  await prisma.contact.deleteMany({
    where: {
      OR: [
        { email: { endsWith: "@import.test" } },
        { email: "nadeem6afridi@yahoo.com" },
      ],
    },
  });
  await prisma.tenant.deleteMany({
    where: { slug: { startsWith: TEST_PREFIX.toLowerCase() } },
  });
}

async function upsertTenant(suffix: "a" | "b") {
  return prisma.tenant.upsert({
    where: { slug: `${TEST_PREFIX.toLowerCase()}tenant-${suffix}` },
    update: { status: "ACTIVE" },
    create: {
      slug: `${TEST_PREFIX.toLowerCase()}tenant-${suffix}`,
      name: `${TEST_PREFIX}TENANT_${suffix.toUpperCase()}`,
      clerkOrgId: `${TEST_PREFIX.toLowerCase()}org_${suffix}`,
      status: "ACTIVE",
    },
  });
}

function mockAuth(tenantId: string, userId = "import-test-user"): ContactImportAuth {
  return async (_options?) => ({
    ok: true,
    context: {
      tenant: {
        id: tenantId,
        name: "Import Test Tenant",
        slug: "import-test",
        clerkOrgId: "import_test_org",
        status: "ACTIVE",
      },
      user: { id: userId, email: "import@test.local", name: "Import Tester" },
    },
  });
}

function buildImportRequest(
  file: File | Blob,
  fields: Record<string, string>,
  origin = "http://localhost:3020",
) {
  const form = new FormData();
  form.set("file", file);
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new NextRequest(`${origin}/api/import/contacts`, {
    method: "POST",
    body: form,
    headers: {
      Origin: origin,
      Referer: `${origin}/dashboard/members`,
    },
  });
}

async function testUiFormContract() {
  const html = readFileSync(MEMBERS_PAGE, "utf8");
  assert(html.includes('action="/api/import/contacts"'), "Members page form must POST to /api/import/contacts");
  assert(html.includes('method="post"'), "Members page form must use method=post");
  assert(html.includes("multipart/form-data"), "Members page form must use multipart encoding");
  console.log("PASS UI form contract → POST /api/import/contacts multipart");
}

async function testRouteMethods() {
  const getRes = await GET();
  assert(getRes.status === 200, `GET should return 200, got ${getRes.status}`);
  const getJson = await getRes.json();
  assert(getJson.allowedMethods?.includes("POST"), "GET JSON should document POST");

  const putRes = await PUT();
  assert(putRes.status === 405, `PUT should return 405, got ${putRes.status}`);
  assert(putRes.headers.get("Allow") === "POST", "405 should include Allow: POST");

  console.log("PASS route methods — GET 200 docs, PUT 405 with Allow: POST");
}

async function testHandlerHttpWithMockAuth(tenantId: string) {
  const csv = readFileSync(FIXTURE_PATH);
  const file = new File([csv], "contact-import-regression.csv", { type: "text/csv" });
  const req = buildImportRequest(file, {
    mode: "import",
    preset: "generic",
    jgTenantId: tenantId,
  });

  const res = await handleContactImportPost(req, mockAuth(tenantId));
  assert(res.status === 307 || res.status === 302, `Expected redirect, got ${res.status}`);
  const location = res.headers.get("location") ?? "";
  assert(location.includes("/dashboard/members"), `Redirect should target members page: ${location}`);
  assert(location.includes("success=import"), `Redirect should include success=import: ${location}`);
  assert(location.includes("importCreated=1"), `Expected 1 created (Alice), got ${location}`);
  assert(location.includes("importUpdated=1"), `Expected 1 updated (duplicate Alice), got ${location}`);
  assert(location.includes("importSkipped=1"), `Expected 1 skipped (Bob no email), got ${location}`);

  console.log("PASS handler HTTP path — redirect with import counts");
}

async function testHandlerBadInput(tenantId: string) {
  const empty = new File([""], "empty.csv", { type: "text/csv" });
  const res = await handleContactImportPost(
    buildImportRequest(empty, { mode: "import", jgTenantId: tenantId }),
    mockAuth(tenantId),
  );
  assert(res.status >= 300 && res.status < 400, "Empty file should redirect, not 500");
  const location = res.headers.get("location") ?? "";
  assert(location.includes("error="), `Empty file should surface error in redirect: ${location}`);

  const badCsv = new File(["not,a,valid\n"], "bad.csv", { type: "text/csv" });
  const badRes = await handleContactImportPost(
    buildImportRequest(badCsv, { mode: "import", jgTenantId: tenantId }),
    mockAuth(tenantId),
  );
  assert(badRes.status >= 300 && badRes.status < 400, "Sparse CSV should redirect, not 500");

  const unauthRes = await handleContactImportPost(
    buildImportRequest(badCsv, { mode: "import" }),
    async () => ({ ok: false, error: "Not authenticated" }),
  );
  assert(unauthRes.status >= 300 && unauthRes.status < 400, "Unauthenticated should redirect to sign-in");

  console.log("PASS bad input — handled redirects, no throw");
}

async function testFixtureDbImport(tenantA: string, tenantB: string) {
  const csv = readFileSync(FIXTURE_PATH);
  const file = new File([csv], "regression.csv", { type: "text/csv" });

  const first = await runContactImportFromFile({
    tenantId: tenantA,
    actorUserId: "import-test-user",
    file,
    preset: "generic",
  });
  if (!first.ok) {
    throw new Error(`Fixture import failed: ${first.error}`);
  }
  const firstData = first.data;
  assert(firstData.created === 1, `Expected 1 created, got ${firstData.created}`);
  assert(firstData.updated === 1, `Expected 1 updated (duplicate), got ${firstData.updated}`);
  assert(firstData.skipped === 1, `Expected 1 skipped (no email), got ${firstData.skipped}`);

  const inA = await prisma.contact.count({
    where: { tenantId: tenantA, email: { endsWith: "@import.test" } },
  });
  assert(inA === 1, `Tenant A should have exactly 1 contact (deduped email), got ${inA}`);

  const fileB = new File([csv], "regression.csv", { type: "text/csv" });
  const inB = await runContactImportFromFile({
    tenantId: tenantB,
    actorUserId: "import-test-user",
    file: fileB,
    preset: "generic",
  });
  assert(inB.ok, `Tenant B import failed`);
  const countB = await prisma.contact.count({
    where: { tenantId: tenantB, email: { endsWith: "@import.test" } },
  });
  assert(countB === 1, `Tenant B should have its own contact, got ${countB}`);

  const cross = await prisma.contact.findFirst({
    where: { tenantId: tenantB, email: "alice-regression@import.test" },
  });
  assert(cross?.tenantId === tenantB, "Contact must stay in tenant B, not leak from A");

  console.log("PASS fixture DB import — create/update/skip + tenant isolation");
}

async function testRealWorldNbFixture(tenantId: string) {
  assert(
    normalizeImportEmail("nadeem6afridi@yahoo.com;") === "nadeem6afridi@yahoo.com",
    "semicolon should be stripped from email",
  );

  const csv = readFileSync(NB_FIXTURE_PATH, "utf8");
  const parsed = rowsFromCsvText(csv);
  const row0 = parsed[0];
  assert(resolveImportEmail(row0) === "nadeem6afridi@yahoo.com", "Email 1 with semicolon");
  assert(resolveImportEmail(parsed[2]) === "bob.secondary@import.test", "Email 2 fallback");

  const file = new File([csv], "contact-import-real-world-nb.csv", { type: "text/csv" });
  const preview = await runContactImportFromFile({
    tenantId,
    actorUserId: "import-test-user",
    file,
    preset: "generic",
    dryRun: true,
  });
  if (!preview.ok) throw new Error(`NB preview failed: ${preview.error}`);
  const data = preview.data;
  assert(data.created === 3, `NB preview created=${data.created}, expected 3`);
  assert(data.skipped === 2, `NB preview skipped=${data.skipped}, expected 2`);
  assert(data.errors.some((e) => e.includes("invalid email")), "bad email row should report error");

  const importResult = await runContactImportFromFile({
    tenantId,
    actorUserId: "import-test-user",
    file,
    preset: "generic",
    dryRun: false,
  });
  if (!importResult.ok) throw new Error(`NB import failed: ${importResult.error}`);
  assert(importResult.data.created === 3, `NB import created=${importResult.data.created}`);

  const nadeem = await prisma.contact.findFirst({
    where: { tenantId, email: "nadeem6afridi@yahoo.com" },
  });
  assert(nadeem?.firstName === "Nadeem", "Nadeem contact should exist with cleaned email");
  assert(Boolean(nadeem?.phone?.includes("0100")), "Phone 1 should be used");

  const res = await handleContactImportPost(
    buildImportRequest(file, { mode: "import", preset: "generic", jgTenantId: tenantId }),
    mockAuth(tenantId),
  );
  assert(res.status !== 500, "NB HTTP import must not 500");
  assert(res.status >= 300 && res.status < 400, "NB HTTP import should redirect");

  console.log("PASS real-world NB fixture — Email 1/2, semicolon, phones, no 500");
}

async function testUnsupportedHeadersNo500(tenantId: string) {
  const csv = "Foo,Bar,Baz\nalpha,beta,gamma\n";
  const file = new File([csv], "bad-headers.csv", { type: "text/csv" });
  const result = await runContactImportFromFile({
    tenantId,
    actorUserId: "import-test-user",
    file,
    preset: "generic",
    dryRun: true,
  });
  if (result.ok) throw new Error("unsupported headers should fail cleanly");
  assert(result.error.includes("No email column found"), result.error);

  const res = await handleContactImportPost(
    buildImportRequest(file, { mode: "preview", jgTenantId: tenantId }),
    mockAuth(tenantId),
  );
  assert(res.status !== 500, "unsupported headers must not 500");
  const location = decodeURIComponent(res.headers.get("location") ?? "");
  assert(location.includes("No+email+column") || location.includes("No email column"), location);

  console.log("PASS unsupported headers — clean error, no 500");
}

async function testNbScaleDryRun(tenantId: string) {
  const header =
    "First Name,Last Name,Email 1,Email 2,Phone 1,Phone 2,Client Type,Subscription Status";
  const row =
    "Scale,User,scale.nb@import.test,,617-555-9999,,NB,Subscribed";
  const csv = [header, ...Array(262).fill(row)].join("\n");
  const file = new File([csv], "nb-scale.csv", { type: "text/csv" });
  const result = await runContactImportFromFile({
    tenantId,
    actorUserId: "import-test-user",
    file,
    preset: "generic",
    dryRun: true,
  });
  if (!result.ok) throw new Error(`262-row NB dry run failed: ${result.error}`);
  assert(result.data.created === 262, `expected 262 would-be-created, got ${result.data.created}`);

  const res = await handleContactImportPost(
    buildImportRequest(file, { mode: "preview", jgTenantId: tenantId }),
    mockAuth(tenantId),
  );
  assert(res.status !== 500, "262-row NB handler must not 500");

  console.log("PASS 262-row NB scale dry-run — no 500");
}

async function testPostRouteWrapperNever500() {
  const req = buildImportRequest(new File(["x"], "x.txt", { type: "text/plain" }), {
    mode: "import",
  });
  const res = await handleContactImportPost(req, async () => ({ ok: false, error: "Not authenticated" }));
  assert(res.status !== 500, `Handler must not return 500, got ${res.status}`);
  const location = res.headers.get("location") ?? "";
  assert(location.includes("/sign-in"), `Unauthenticated should redirect to sign-in: ${location}`);
  console.log("PASS POST handler — unauthenticated redirect before body processing");
}

async function testOversizedContentLengthRejected() {
  let authCalls = 0;
  const res = await handleContactImportPost(
    new NextRequest("http://localhost:3020/api/import/contacts", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3020",
        Referer: "http://localhost:3020/dashboard/members",
        "Content-Length": String(MAX_IMPORT_REQUEST_BYTES + 1),
      },
      body: "too-large",
    }),
    async () => {
      authCalls += 1;
      throw new Error("auth must not run when Content-Length exceeds limit");
    },
  );
  assert(authCalls === 0, "Auth must not run for oversized Content-Length");
  assert(res.status >= 300 && res.status < 400, "Oversized upload should redirect");
  const location = decodeURIComponent(res.headers.get("location") ?? "");
  assert(location.includes("too+large") || location.includes("too large"), location);
  console.log("PASS Content-Length guard — rejects before auth");
}

async function testAuthBeforeFormDataWithTenantHint() {
  const tenantId = "tenant-hint-only";
  let authPass = 0;
  const auth: ContactImportAuth = async (options?) => {
    authPass += 1;
    if (authPass === 1) {
      assert(!options?.tenantIdHint, "First auth call must not use tenant hint");
      return { ok: false, error: "No active tenant context" };
    }
    assert(options?.tenantIdHint === tenantId, "Second auth call must use form tenant hint");
    return {
      ok: true,
      context: {
        tenant: {
          id: tenantId,
          name: "Hint Tenant",
          slug: "hint",
          clerkOrgId: "hint_org",
          status: "ACTIVE",
        },
        user: { id: "user-1", email: "u@test.local", name: "User" },
      },
    };
  };

  const csv = readFileSync(FIXTURE_PATH);
  const file = new File([csv], "regression.csv", { type: "text/csv" });
  const res = await handleContactImportPost(
    buildImportRequest(file, { mode: "preview", jgTenantId: tenantId }),
    auth,
  );
  assert(authPass === 2, `Expected 2 auth passes (cookie fail, hint succeed), got ${authPass}`);
  assert(res.status >= 300 && res.status < 400, `Expected redirect, got ${res.status}`);
  console.log("PASS auth before formData — tenant hint only after authenticated cookie miss");
}

function testContentLengthHelper() {
  const okReq = new NextRequest("http://localhost/api/import/contacts", {
    headers: { "Content-Length": "1024" },
  });
  assert(rejectOversizedImportRequest(okReq) === null, "Small Content-Length should pass");

  const badReq = new NextRequest("http://localhost/api/import/contacts", {
    headers: { "Content-Length": String(MAX_IMPORT_REQUEST_BYTES + 100) },
  });
  const badMessage = rejectOversizedImportRequest(badReq);
  assert(Boolean(badMessage?.includes("too large")), "Large Content-Length should fail");
  console.log("PASS Content-Length helper");
}

async function main() {
  console.log("Contact import regression\n");
  ensureSafeDb();

  await testUiFormContract();
  await testRouteMethods();
  testContentLengthHelper();

  await cleanup();
  const tenantA = await upsertTenant("a");
  const tenantB = await upsertTenant("b");

  try {
    await testHandlerHttpWithMockAuth(tenantA.id);
    await prisma.contact.deleteMany({ where: { tenantId: tenantA.id, email: { endsWith: "@import.test" } } });
    await testFixtureDbImport(tenantA.id, tenantB.id);
    await testRealWorldNbFixture(tenantA.id);
    await testUnsupportedHeadersNo500(tenantA.id);
    await testNbScaleDryRun(tenantA.id);
    await testHandlerBadInput(tenantA.id);
    await testPostRouteWrapperNever500();
    await testOversizedContentLengthRejected();
    await testAuthBeforeFormDataWithTenantHint();
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }

  console.log("\nAll contact import regression checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
