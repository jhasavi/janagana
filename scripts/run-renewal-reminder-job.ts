#!/usr/bin/env tsx
/**
 * Automated renewal reminders — queue + deliver for memberships expiring in 30/60/90 days.
 *
 *   npm run job:renewal-reminders
 *   npm run job:renewal-reminders -- --tenant=purple-wings --dry-run
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { queueRenewalReminderCommunication } from "@/lib/communications/outbox";
import { hasUsableEmail } from "@/lib/memberships/renewals";

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
  const tenantSlug = (args.tenant as string) || undefined;
  const dryRun = Boolean(args.dryRun);

  const tenants = tenantSlug
    ? await prisma.tenant.findMany({ where: { slug: tenantSlug, status: "ACTIVE" } })
    : await prisma.tenant.findMany({ where: { status: "ACTIVE" } });

  if (tenants.length === 0) {
    throw new Error(tenantSlug ? `Active tenant not found: ${tenantSlug}` : "No active tenants");
  }

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 90);
  const cooldown = new Date(now);
  cooldown.setDate(cooldown.getDate() - 7);

  let queued = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const memberships = await prisma.membership.findMany({
      where: {
        tenantId: tenant.id,
        status: "ACTIVE",
        expiresAt: { gte: now, lte: horizon },
      },
      include: {
        contact: { select: { email: true } },
        communications: {
          where: { purpose: "RENEWAL_REMINDER" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    for (const membership of memberships) {
      if (!hasUsableEmail(membership.contact.email)) {
        skipped += 1;
        continue;
      }
      const last = membership.communications[0];
      if (last && last.createdAt >= cooldown) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(`DRY RUN would remind ${membership.id} (${tenant.slug})`);
        queued += 1;
        continue;
      }

      const message = await queueRenewalReminderCommunication(membership.id);
      if (message) {
        queued += 1;
        console.log(`Queued renewal reminder for ${membership.id} (${tenant.slug})`);
      } else {
        skipped += 1;
      }
    }
  }

  console.log(`Renewal reminder job complete: queued=${queued} skipped=${skipped}${dryRun ? " (dry run)" : ""}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
