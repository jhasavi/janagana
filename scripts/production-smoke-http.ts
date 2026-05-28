/**
 * Read-only + optional form POST production smoke (no secrets printed).
 * Usage: npx tsx scripts/production-smoke-http.ts [--submit]
 */

const BASE = process.env.SMOKE_BASE_URL ?? "https://janagana.namasteneedham.com";
const SUBMIT = process.argv.includes("--submit");
const MARKER = `qa-smoke-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).slice(-4)}`;

type CheckResult = {
  path: string;
  status: number;
  ok: boolean;
  note: string;
};

async function fetchCheck(path: string, expectInBody?: string[]): Promise<CheckResult> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  const missing = (expectInBody ?? []).filter((s) => !text.includes(s));
  const ok = res.status >= 200 && res.status < 400 && missing.length === 0;
  return {
    path,
    status: res.status,
    ok,
    note: missing.length > 0 ? `missing body: ${missing.join(", ")}` : "ok",
  };
}

async function submitLeadCapture(
  tenantSlug: string,
  interest: string,
  email: string,
  firstName: string,
  lastName: string,
) {
  const pageUrl = `${BASE}/portal/${tenantSlug}/contact?interest=${interest}`;
  const pageRes = await fetch(pageUrl);
  if (!pageRes.ok) {
    return { ok: false, note: `page load failed ${pageRes.status}` };
  }

  const form = new FormData();
  form.set("firstName", firstName);
  form.set("lastName", lastName);
  form.set("email", email);
  form.set("phone", "555-0199");
  form.set("message", `QA smoke test ${MARKER} — safe to delete`);
  form.set("interestType", interest.toUpperCase().replace(/-/g, "_"));

  const postRes = await fetch(pageUrl, {
    method: "POST",
    body: form,
    redirect: "manual",
  });

  const location = postRes.headers.get("location") ?? "";
  const ok =
    postRes.status >= 300 &&
    postRes.status < 400 &&
    (location.includes("status=success") || location.includes("already"));

  return {
    ok,
    note: ok ? `redirect ${postRes.status} → ${location.slice(0, 80)}` : `unexpected ${postRes.status}`,
    email,
  };
}

async function main() {
  console.log(`Production smoke (read-only GET) — base: ${BASE}`);
  console.log(`Marker prefix for test data: ${MARKER}`);

  const checks: CheckResult[] = [];

  const embedRes = await fetch(`${BASE}/api/embed/events?tenantSlug=purple-wings&maxItems=1`);
  const embedJson = await embedRes.json().catch(() => ({}));
  checks.push({
    path: "/api/embed/events?tenantSlug=purple-wings",
    status: embedRes.status,
    ok: embedRes.ok && (embedJson as { success?: boolean }).success === true,
    note: embedRes.ok ? "embed JSON ok" : "embed API missing or error — deploy JanaGana",
  });

  const healthRes = await fetch(`${BASE}/api/health/ready`);
  const healthJson = await healthRes.json().catch(() => ({}));
  checks.push({
    path: "/api/health/ready",
    status: healthRes.status,
    ok: healthRes.status === 200 && (healthJson as { ok?: boolean }).ok === true,
    note: JSON.stringify(healthJson).slice(0, 80),
  });

  checks.push(
    await fetchCheck("/portal/purple-wings", ["The Purple Wings", "Public portal"]),
    await fetchCheck("/portal/namaste-boston", ["Namaste Boston", "Public portal"]),
    await fetchCheck("/portal/purple-wings/contact?interest=newsletter", ["Newsletter"]),
    await fetchCheck("/portal/namaste-boston/contact?interest=investment", ["Investment analysis"]),
    await fetchCheck("/sign-in"),
  );

  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.status} ${c.path} — ${c.note}`);
  }

  if (SUBMIT) {
    console.log("\nForm submissions (--submit):");
    const pw = await submitLeadCapture(
      "purple-wings",
      "newsletter",
      `${MARKER}-pw@example.com`,
      "QA",
      "PurpleWings",
    );
    console.log(`${pw.ok ? "PASS" : "FAIL"} purple-wings newsletter — ${pw.note} (${pw.email})`);

    const nb = await submitLeadCapture(
      "namaste-boston",
      "investment",
      `${MARKER}-nb@example.com`,
      "QA",
      "NamasteBoston",
    );
    console.log(`${nb.ok ? "PASS" : "FAIL"} namaste-boston investment — ${nb.note} (${nb.email})`);
    console.log("\nAdmin verification required: sign in and check Contacts count per tenant.");
    console.log(`Test emails to clean up: ${MARKER}-pw@example.com, ${MARKER}-nb@example.com`);
  } else {
    console.log("\nSkipping form POST (run with --submit to create test leads).");
  }

  const failed = checks.filter((c) => !c.ok).length;
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
