import { spawnSync } from "node:child_process";

const gates = [
  "npm run build",
  "npm run typecheck",
  "npm run lint",
  "npm run prisma:validate",
  "npm run check:env",
  "npm run check:db:test",
  "npm run test:actions",
  "npm run test:portal",
  "npm run test:registration:ops",
  "npm run test:second-tenant",
  "npm run test:e2e:foundation",
  "npm run test:e2e:env",
  "npm run test:e2e:portal",
  "npm run smoke:local-redirects",
];

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
  if (exitCode !== 0) {
    console.error(`\nGate failed: ${gate}`);
    process.exit(exitCode);
  }
}

console.log("\nAll release gates passed.");
