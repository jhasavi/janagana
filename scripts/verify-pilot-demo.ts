#!/usr/bin/env tsx
/**
 * Pilot Demo v1 readiness checks (non-destructive).
 *
 *   npm run verify:pilot-demo
 *   npm run verify:pilot-demo -- --base-url=https://janagana.namasteneedham.com
 *
 * Does NOT import data, mutate production, or call destructive scripts.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { config as loadEnv } from "dotenv";
import {
  resolveImportEmail,
  resolveImportPhone,
  rowsFromCsvText,
  validateImportSpreadsheet,
} from "@/lib/import/contact-roster";
import { COMMUNITY_OS_NAV, getVisibleCommunityOsNav, hideComingSoonNav } from "@/lib/pilot/dashboard-nav";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const PILOT_SLUG = "purple-wings";
const PRODUCTION_DEMO_URL = "https://janagana.namasteneedham.com";
const FIXTURES = join(process.cwd(), "fixtures");

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    if (value) out[key] = value;
  }
  return out;
}

function fail(messages: string[]) {
  for (const message of messages) console.error(`FAIL ${message}`);
  throw new Error("Pilot demo verification failed — see messages above");
}

async function checkHttp(
  url: string,
  label: string,
  options?: { allowRedirect?: boolean; expectedStatuses?: number[] },
) {
  const allowRedirect = options?.allowRedirect ?? true;
  const expected = options?.expectedStatuses ?? (allowRedirect ? [200, 302, 307, 308] : [200]);
  try {
    const response = await fetch(url, { redirect: "manual" });
    const ok = expected.includes(response.status);
    console.log(`${ok ? "OK" : "FAIL"} ${label}: ${response.status} ${url}`);
    return { ok, response };
  } catch (error) {
    console.log(`FAIL ${label}: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, response: null };
  }
}

function checkParserFixture(
  fileName: string,
  label: string,
  assertions: (rows: ReturnType<typeof rowsFromCsvText>) => void,
) {
  const path = join(FIXTURES, fileName);
  const text = readFileSync(path, "utf8");
  const rows = rowsFromCsvText(text);
  const validationError = validateImportSpreadsheet(rows);
  if (validationError) {
    console.log(`FAIL parser ${label}: ${validationError}`);
    return false;
  }
  try {
    assertions(rows);
    console.log(`OK parser ${label}: headers accepted (${fileName})`);
    return true;
  } catch (error) {
    console.log(`FAIL parser ${label}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function checkDashboardRoute(baseUrl: string, path: string, label: string) {
  return checkHttp(`${baseUrl}${path}`, label, {
    expectedStatuses: [200, 302, 307, 308],
  });
}

function checkNavHideComingSoon() {
  const hidden = hideComingSoonNav();
  const visible = getVisibleCommunityOsNav();
  const visibleHrefs = visible.flatMap((g) => g.items.map((i) => i.href));
  const comingSoonHrefs = COMMUNITY_OS_NAV.flatMap((g) =>
    g.items.filter((i) => i.status === "coming-soon").map((i) => i.href),
  );
  const leaked = comingSoonHrefs.filter((href) => visibleHrefs.includes(href));
  if (!hidden) {
    console.warn("WARN PILOT_HIDE_COMING_SOON_NAV=false — coming-soon items intentionally visible");
    return true;
  }
  if (leaked.length > 0) {
    console.log(`FAIL nav hide: coming-soon routes still visible: ${leaked.join(", ")}`);
    return false;
  }
  console.log(`OK nav hide: no coming-soon items when PILOT_HIDE_COMING_SOON_NAV enabled (${visibleHrefs.length} live routes)`);
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (args["base-url"] ?? PRODUCTION_DEMO_URL).replace(/\/$/, "");
  let failed = false;

  console.log("Pilot Demo v1 verification (non-destructive)");
  console.log(`Base URL: ${baseUrl}`);
  console.log("");

  // 1. Production commit endpoint
  try {
    const res = await fetch(`${baseUrl}/api/import/contacts`);
    const json = await res.json();
    const commit = typeof json.commit === "string" ? json.commit : "";
    const ok = res.status === 200 && json.ok === true && commit.length >= 7;
    console.log(`${ok ? "OK" : "FAIL"} import API commit: ${commit || "(missing)"}`);
    if (!ok) failed = true;
  } catch (error) {
    console.log(`FAIL import API commit: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }

  // 2. Import page route exists (not 404)
  const importPage = await checkHttp(`${baseUrl}/dashboard/members/import`, "route /dashboard/members/import");
  if (!importPage.ok) failed = true;
  else if (importPage.response?.status === 307 || importPage.response?.status === 302) {
    const location = importPage.response.headers.get("location") ?? "";
    if (!location.includes("members/import") && !location.includes("sign-in")) {
      console.log(`WARN import route redirect unexpected: ${location}`);
    }
  }

  // 3–5. Parser fixtures (local, no DB)
  const parserChecks = [
    checkParserFixture("contact-import-regression.csv", "name/email/phone", (rows) => {
      const email = resolveImportEmail(rows[0]);
      if (email !== "alice-regression@import.test") throw new Error(`expected alice email, got ${email}`);
      const phone = resolveImportPhone(rows[0]);
      if (!phone?.includes("555")) throw new Error("expected phone from Name/Email/Phone row");
    }),
    checkParserFixture("contact-import-real-world-nb.csv", "NB real-world headers", (rows) => {
      const email = resolveImportEmail(rows[0]);
      if (email !== "nadeem6afridi@yahoo.com") throw new Error(`Email 1 semicolon failed: ${email}`);
      const email2 = resolveImportEmail(rows[2]);
      if (email2 !== "bob.secondary@import.test") throw new Error(`Email 2 fallback failed: ${email2}`);
      const phone = resolveImportPhone(rows[0]);
      if (!phone?.includes("0100")) throw new Error("Phone 1 failed");
    }),
    checkParserFixture("contact-import-raklet-sample.csv", "Raklet headers", (rows) => {
      const email = resolveImportEmail(rows[0]);
      if (email !== "priya.raklet@import.test") throw new Error(`E-mail address failed: ${email}`);
      const fn = rows[0]["First name"]?.trim();
      const ln = rows[0]["Last name"]?.trim();
      if (fn !== "Priya" || ln !== "Sharma") throw new Error("First name / Last name columns missing");
      const memberNo = rows[0]["Member No"]?.trim();
      if (memberNo !== "M-000001") throw new Error("Member No column missing");
    }),
  ];
  if (parserChecks.some((ok) => !ok)) failed = true;

  // 6–8. Dashboard routes exist
  for (const [path, label] of [
    ["/dashboard/members", "route /dashboard/members"],
    ["/dashboard/memberships/renewals", "route /dashboard/memberships/renewals"],
    ["/dashboard/payments", "route /dashboard/payments"],
  ] as const) {
    const result = await checkDashboardRoute(baseUrl, path, label);
    if (!result.ok) failed = true;
  }

  // 9. Portal events
  const portalEvents = await checkHttp(
    `${baseUrl}/portal/${PILOT_SLUG}/events`,
    `portal /portal/${PILOT_SLUG}/events`,
    { expectedStatuses: [200, 302, 307, 308] },
  );
  if (!portalEvents.ok) failed = true;

  // 10. Nav hide coming soon
  if (!checkNavHideComingSoon()) failed = true;

  console.log("");
  if (failed) {
    fail([]);
  }
  console.log("Pilot Demo v1 verification: all automated checks passed");
  console.log("Manual: signed-in CSV import on production — see docs/JANAGANA_LITE_PILOT_DEMO_V1.md");
}

main().catch(() => {
  process.exitCode = 1;
});
