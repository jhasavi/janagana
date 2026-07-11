#!/usr/bin/env tsx
/**
 * Automated renewal reminders — queue + deliver for memberships expiring in 30/60/90 days.
 *
 *   npm run job:renewal-reminders
 *   npm run job:renewal-reminders -- --tenant=purple-wings --dry-run
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { runRenewalReminderJob } from "@/lib/jobs/renewal-reminders";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg.startsWith("--tenant=")) out.tenant = arg.slice("--tenant=".length);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runRenewalReminderJob(prisma, {
    tenantSlug: args.tenant as string | undefined,
    dryRun: Boolean(args.dryRun),
  });
  console.log(
    `Renewal reminder job complete: queued=${result.queued} skipped=${result.skipped}${result.dryRun ? " (dry run)" : ""}`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
