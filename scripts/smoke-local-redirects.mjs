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

async function checkRootRedirect() {
  const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
  assert(response.status >= 300 && response.status < 400, `Expected redirect for /, got ${response.status}`);

  const location = parseLocation(baseUrl, response.headers.get("location"));
  assert(location, "Missing redirect location for /");
  assert(location.pathname === "/sign-in", `Expected / to redirect to /sign-in, got ${location.pathname}`);

  const redirectUrl = location.searchParams.get("redirect_url");
  assert(!!redirectUrl, "Expected redirect_url query param on / redirect");
  assert(
    redirectUrl.startsWith(`${baseUrl}/`),
    `Expected redirect_url to start with ${baseUrl}/, got ${redirectUrl}`,
  );

  return location.toString();
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

  const rootLocation = await checkRootRedirect();
  console.log(`- / redirect: ${rootLocation}`);

  const signOutLocation = await checkSignOutRedirect();
  console.log(`- /api/sign-out redirect: ${signOutLocation}`);

  console.log("redirect smoke: PASS");
}

main().catch((error) => {
  console.error(`redirect smoke: FAIL - ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
