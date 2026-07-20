import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

/**
 * Regression coverage for the "Cookies can only be modified in a Server Action
 * or Route Handler" crash: requireActiveTenantForActions() is called both from
 * "use server" actions and directly from page-render Server Components, but
 * only the former context permits mutating cookies. Next's own `cookies()` API
 * throws a *different* error ("called outside a request scope") when invoked
 * from a bare script, so there is no way to faithfully reproduce the real
 * render-context error outside an actual Next.js request — that coverage lives
 * in the real-Clerk e2e suite (npm run test:real-clerk) and the manual QA pass
 * before a demo. This script instead statically verifies the fix and the
 * architecture it depends on are both still in place.
 */

function testCookieWriteIsBestEffort() {
  const source = readFileSync(join(ROOT, "lib/tenant/active-tenant-cookie.ts"), "utf8");
  const fn = source.slice(source.indexOf("export async function setActiveTenantCookie"));
  assert(fn.includes("try {"), "setActiveTenantCookie must wrap its cookie write in try/catch");
  assert(fn.includes("store.set("), "setActiveTenantCookie must still attempt the real write");
  assert(fn.includes("catch"), "setActiveTenantCookie must catch a failed write rather than throw");
  console.log("PASS setActiveTenantCookie treats the write as best-effort");
}

function testRenderSafeDocumentation() {
  const source = readFileSync(join(ROOT, "lib/tenant/active-tenant-context.ts"), "utf8");
  const docStart = source.indexOf("export async function requireActiveTenantForActions");
  const doc = source.slice(Math.max(0, docStart - 400), docStart);
  assert(
    doc.toLowerCase().includes("safe to call from a server component render"),
    "requireActiveTenantForActions doc comment must reflect it's render-safe",
  );
  console.log("PASS requireActiveTenantForActions documents render-safety");
}

/** Confirms the architecture this fix protects (render calling the shared helper) still exists. */
function testPagesStillCallSharedHelperFromRender() {
  const eventsRegistrationsPage = readFileSync(
    join(ROOT, "app/dashboard/events/[eventId]/registrations/page.tsx"),
    "utf8",
  );
  assert(
    eventsRegistrationsPage.includes("listEventRegistrations(eventId)"),
    "registrations page should still call listEventRegistrations() directly from render",
  );

  const eventsActions = readFileSync(join(ROOT, "lib/actions/events.ts"), "utf8");
  const fnStart = eventsActions.indexOf("export async function listEventRegistrations");
  const fnBody = eventsActions.slice(fnStart, fnStart + 400);
  assert(
    fnBody.includes("requireActiveTenantForActions"),
    "listEventRegistrations should still funnel through requireActiveTenantForActions",
  );
  console.log("PASS confirmed render-calls-shared-helper pattern this fix protects");
}

function main() {
  testCookieWriteIsBestEffort();
  testRenderSafeDocumentation();
  testPagesStillCallSharedHelperFromRender();
  console.log("Active-tenant cookie safety checks passed");
}

main();
