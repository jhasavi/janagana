#!/usr/bin/env tsx
/**
 * Full production readiness gate (orchestrator).
 *
 *   npm run verify:production-ready
 *   npm run verify:production-ready -- --base-url=https://janagana.namasteneedham.com
 */
import { spawnSync } from "node:child_process";

const baseUrlArg = process.argv.find((a) => a.startsWith("--base-url="));
const baseSuffix = baseUrlArg ? ` ${baseUrlArg}` : " --base-url=https://janagana.namasteneedham.com";

const steps = [
  "npm run check:env",
  "npm run verify:production-env -- --strict",
  `npm run verify:pilot-demo${baseSuffix}`,
  `npm run smoke:production`,
  `npm run verify:pilot-signoff${baseSuffix}`,
  `npm run verify:tpw${baseSuffix}`,
  `npm run verify:nb${baseSuffix}`,
  "npm run verify:tenants",
];

let failed = false;

console.log("Production readiness verification\n");

for (const cmd of steps) {
  console.log(`\n=== ${cmd} ===`);
  const result = spawnSync(cmd, { shell: true, stdio: "inherit" });
  if (result.status !== 0) {
    failed = true;
    console.error(`FAILED: ${cmd}`);
    break;
  }
}

if (failed) {
  console.error("\nverify:production-ready: FAILED");
  process.exit(1);
}

console.log("\nverify:production-ready: PASS");
console.log("Manual: complete Part A/B in docs/01-PILOT-RUNBOOK.md and record sign-off in docs/04-PRODUCTION.md");
