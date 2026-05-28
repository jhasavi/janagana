import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const fullGates = [
  "npm run typecheck",
  "npm run lint",
  "npm run prisma:validate",
  "npm run check:env",
  "npm run check:db:test",
  "npm run verify:tenants",
  "npm run test:actions",
  "npm run test:lead:capture",
  "npm run test:portal",
  "npm run test:portal:concurrency",
  "npm run test:registration:ops",
  "npm run test:second-tenant",
  "npm run test:dashboard:semantics",
  // e2e tests start a dev server via playwright webServer; run before build
  // so the production .next artifact does not conflict with next dev startup.
  "npm run test:e2e:foundation",
  "npm run test:e2e:env",
  "npm run test:e2e:portal",
  "npm run test:e2e:dual-portal",
  "npm run test:e2e:contact-interest",
  "npm run smoke:local-redirects",
  // build last: confirms production artifact is clean after all other gates pass
  "npm run build",
];

const quickGates = [
  "npm run typecheck",
  "npm run lint",
  "npm run prisma:validate",
  "npm run check:env",
  "npm run check:db:test",
  "npm run verify:tenants",
  "npm run test:actions",
  "npm run test:lead:capture",
  "npm run test:portal",
  "npm run test:portal:concurrency",
  "npm run test:registration:ops",
  "npm run test:second-tenant",
  "npm run test:dashboard:semantics",
  "npm run test:e2e:dual-portal",
  "npm run test:e2e:contact-interest",
];

type GateResult = {
  command: string;
  exitCode: number;
};

const mode = process.argv[2] === "quick" ? "quick" : "full";
const gates = mode === "quick" ? quickGates : fullGates;
const report: {
  mode: "quick" | "full";
  startedAt: string;
  finishedAt?: string;
  success?: boolean;
  results: GateResult[];
} = {
  mode,
  startedAt: new Date().toISOString(),
  results: [],
};

function writeReport() {
  const outDir = resolve(process.cwd(), "test-results");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `release-gate-report.${mode}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote gate report: ${outPath}`);
}

function run(cmd: string): number {
  console.log(`\n=== ${cmd} ===`);
  const result = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });

  return result.status ?? 1;
}

for (const gate of gates) {
  const exitCode = run(gate);
  report.results.push({ command: gate, exitCode });
  if (exitCode !== 0) {
    report.finishedAt = new Date().toISOString();
    report.success = false;
    writeReport();
    console.error(`\nGate failed: ${gate}`);
    process.exit(exitCode);
  }
}

report.finishedAt = new Date().toISOString();
report.success = true;
writeReport();
console.log(`\nAll ${mode} release gates passed.`);
