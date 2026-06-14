import {
  defaultVisitorReturnUrl,
  isSafeVisitorReturnUrl,
  readSafeReturnUrl,
  visitorReturnUrlWithStatus,
} from "@/lib/portal/safe-return-url";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  assert(isSafeVisitorReturnUrl("https://www.thepurplewings.org/events"), "tpw prod");
  assert(isSafeVisitorReturnUrl("http://localhost:3000/events"), "localhost");
  assert(!isSafeVisitorReturnUrl("https://evil.com/phish"), "block evil");
  assert(!isSafeVisitorReturnUrl("//evil.com"), "block protocol-relative");

  assert(readSafeReturnUrl("https://www.thepurplewings.org/events") !== null, "read safe");
  assert(readSafeReturnUrl("javascript:alert(1)") === null, "block js");

  assert((defaultVisitorReturnUrl("purple-wings") ?? "").includes("thepurplewings.org"), "tpw default");
  assert(defaultVisitorReturnUrl("unknown-slug") === null, "unknown tenant");

  const withStatus = visitorReturnUrlWithStatus("https://www.thepurplewings.org/events", "registration", "registered");
  assert(withStatus.includes("registration=registered"), "append status");

  console.log("portal-return-url: ok");
}

main();
