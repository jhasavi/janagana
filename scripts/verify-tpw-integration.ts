#!/usr/bin/env tsx
/**
 * TPW integration readiness checks (JanaGana side).
 *
 *   npm run verify:tpw
 *   npm run verify:tpw -- --base-url=https://janagana.namasteneedham.com
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { configuredAppUrl } from "@/lib/environment";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const SLUG = "purple-wings";

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    if (value) out[key] = value;
  }
  return out;
}

async function checkHttp(url: string, label: string) {
  try {
    const response = await fetch(url, { redirect: "follow" });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? "OK" : "FAIL"} ${label}: ${response.status} ${url}`);
    return ok;
  } catch (error) {
    console.log(`FAIL ${label}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (args["base-url"] ?? configuredAppUrl()).replace(/\/$/, "");
  let failed = false;

  console.log("TPW integration verification");
  console.log(`Base URL: ${baseUrl}`);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: SLUG },
    select: { id: true, name: true, slug: true, status: true, clerkOrgId: true },
  });

  if (!tenant || tenant.status !== "ACTIVE") {
    console.error(`FAIL tenant: missing or inactive (${SLUG})`);
    failed = true;
  } else {
    console.log(`OK tenant: ${tenant.name} clerkOrgId=${tenant.clerkOrgId}`);
  }

  if (tenant) {
    try {
      const [contacts, classImports, publishedEvents, tiers] = await Promise.all([
        prisma.contact.count({ where: { tenantId: tenant.id } }),
        prisma.contact.count({ where: { tenantId: tenant.id, source: "tpw_class_import" } }),
        prisma.event.count({ where: { tenantId: tenant.id, status: "PUBLISHED" } }),
        prisma.membershipTier.count({ where: { tenantId: tenant.id, active: true } }),
      ]);
      console.log(`OK data: contacts=${contacts} classImports=${classImports} publishedEvents=${publishedEvents} activeTiers=${tiers}`);
      if (classImports === 0) {
        console.warn("WARN class roster: no tpw_class_import contacts — run npm run import:tpw-class");
      }
      if (publishedEvents === 0) {
        console.warn("WARN events: no published events — operators should publish at least one class/event");
      }
    } catch (error) {
      console.warn(`WARN database metrics skipped: ${error instanceof Error ? error.message : String(error)}`);
      console.warn("  Run db:migrate against this DATABASE_URL, or point .env.local at production for full verify.");
    }
  }

  const checks = [
    [`${baseUrl}/portal/${SLUG}`, "portal home"],
    [`${baseUrl}/portal/${SLUG}/events`, "portal events"],
    [`${baseUrl}/portal/${SLUG}/contact?interest=newsletter`, "community newsletter"],
    [`${baseUrl}/portal/${SLUG}/contact?interest=membership-interest`, "membership interest"],
    [`${baseUrl}/portal/${SLUG}/join`, "membership join"],
    [`${baseUrl}/api/embed/events?tenantSlug=${SLUG}&maxItems=3`, "embed events API"],
  ] as const;

  for (const [url, label] of checks) {
    const ok = await checkHttp(url, label);
    if (!ok) failed = true;
  }

  if (failed) {
    throw new Error("TPW integration verification failed — see messages above");
  }
  console.log("TPW integration verification: all checks passed");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
