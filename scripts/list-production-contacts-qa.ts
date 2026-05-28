/**
 * Read-only: list contacts for pilot tenants, highlighting QA test emails.
 *
 * Usage (production DB — set URL in env, never commit):
 *   PRODUCTION_DATABASE_URL='postgresql://...' npx tsx scripts/list-production-contacts-qa.ts
 *
 * Or with .env.local containing production DATABASE_URL (do not print secrets).
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const QA_EMAIL_PATTERN = /^(qa-prod-|qa-smoke-|test-production-)/i;

const TENANT_SLUGS = ["purple-wings", "namaste-boston"] as const;

function maskDatabaseTarget(raw: string | undefined) {
  if (!raw) return { host: "unknown", database: "unknown" };
  try {
    const url = new URL(raw);
    return {
      host: url.hostname || "unknown",
      database: (url.pathname || "/").replace(/^\//, "") || "unknown",
    };
  } catch {
    return { host: "unknown", database: "unknown" };
  }
}

function isProductionLike(host: string, database: string) {
  const signal = `${host} ${database}`.toLowerCase();
  const prod = ["prod", "production", "live", "neon.tech"];
  const safe = ["localhost", "127.0.0.1", "local", "dev", "test", "janagana_v3"];
  return prod.some((t) => signal.includes(t)) && !safe.some((t) => signal.includes(t));
}

async function main() {
  const dbUrl = process.env.PRODUCTION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("Set PRODUCTION_DATABASE_URL or DATABASE_URL");
  }

  const target = maskDatabaseTarget(dbUrl);
  console.log("QA contact listing (read-only)");
  console.log(`- host: ${target.host}`);
  console.log(`- database: ${target.database}`);
  if (!isProductionLike(target.host, target.database)) {
    console.warn("- WARN: target does not look like a production host; confirm before trusting results");
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    for (const slug of TENANT_SLUGS) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      });

      if (!tenant) {
        console.log(`\n## ${slug}\nMISSING tenant row in database\n`);
        continue;
      }

      const [contacts, registrations, memberships] = await Promise.all([
        prisma.contact.findMany({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            type: true,
            createdAt: true,
            _count: { select: { registrations: true } },
          },
        }),
        prisma.eventRegistration.count({ where: { tenantId: tenant.id, status: "CONFIRMED" } }),
        prisma.membership.count({ where: { tenantId: tenant.id } }),
      ]);

      const qaContacts = contacts.filter((c) => QA_EMAIL_PATTERN.test(c.email));
      const otherContacts = contacts.filter((c) => !QA_EMAIL_PATTERN.test(c.email));

      console.log(`\n## ${tenant.name} (${tenant.slug})`);
      console.log(`- total contacts: ${contacts.length}`);
      console.log(`- qa-tagged emails: ${qaContacts.length}`);
      console.log(`- confirmed event registrations: ${registrations}`);
      console.log(`- formal memberships: ${memberships}`);

      if (qaContacts.length > 0) {
        console.log("\nQA records:");
        for (const c of qaContacts) {
          console.log(
            `  [QA] ${c.email} | ${c.firstName} ${c.lastName} | type=${c.type} | regs=${c._count.registrations} | ${c.createdAt.toISOString()}`,
          );
        }
      }

      if (otherContacts.length > 0) {
        console.log("\nOther contacts (non-QA prefix):");
        for (const c of otherContacts.slice(0, 20)) {
          console.log(
            `  ${c.email} | ${c.firstName} ${c.lastName} | type=${c.type} | regs=${c._count.registrations}`,
          );
        }
        if (otherContacts.length > 20) {
          console.log(`  ... and ${otherContacts.length - 20} more`);
        }
      }

      if (contacts.length === 0) {
        console.log("\n(no contacts — submissions may have gone to TPW Supabase newsletter, not JanaGana portal)");
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
