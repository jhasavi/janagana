#!/usr/bin/env node

const baseUrl = process.env.APP_BASE_URL || "http://localhost:3020";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseLocation(base, locationHeader) {
  if (!locationHeader) {
    return null;
  }
  return new URL(locationHeader, base);
}

async function checkRootLandingPage() {
  // "/" is the public marketing landing page for logged-out visitors (no longer a redirect).
  const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
  assert(response.status === 200, `Expected 200 for public landing page /, got ${response.status}`);

  const body = await response.text();
  assert(body.includes("Keep your website"), "Expected landing page hero copy on /");

  return `${baseUrl}/ (200, landing page)`;
}

async function checkSignOutRedirect() {
  const response = await fetch(`${baseUrl}/api/sign-out`, {
    method: "POST",
    redirect: "manual",
  });
  assert(response.status >= 300 && response.status < 400, `Expected redirect for /api/sign-out, got ${response.status}`);

  const location = parseLocation(baseUrl, response.headers.get("location"));
  assert(location, "Missing redirect location for /api/sign-out");
  assert(location.pathname === "/sign-in", `Expected /api/sign-out to redirect to /sign-in, got ${location.pathname}`);
  assert(location.origin === new URL(baseUrl).origin, `Expected /api/sign-out origin ${new URL(baseUrl).origin}, got ${location.origin}`);

  return location.toString();
}

async function main() {
  console.log(`Running local redirect smoke checks against ${baseUrl}`);

  const rootLocation = await checkRootLandingPage();
  console.log(`- / : ${rootLocation}`);

  const signOutLocation = await checkSignOutRedirect();
  console.log(`- /api/sign-out redirect: ${signOutLocation}`);

  console.log("redirect smoke: PASS");
}

main().catch((error) => {
  console.error(`redirect smoke: FAIL - ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
