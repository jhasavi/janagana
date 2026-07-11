#!/usr/bin/env tsx
/**
 * Namaste Boston integration readiness (mirror of verify:tpw).
 *
 *   npm run verify:nb
 *   npm run verify:nb -- --base-url=https://janagana.namasteneedham.com
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { configuredAppUrl } from "@/lib/environment";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const SLUG = "namaste-boston";

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

  console.log("Namaste Boston integration verification");
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

    const [contacts, publishedEvents, imported] = await Promise.all([
      prisma.contact.count({ where: { tenantId: tenant.id } }),
      prisma.event.count({ where: { tenantId: tenant.id, status: "PUBLISHED" } }),
      prisma.contact.count({
        where: {
          tenantId: tenant.id,
          OR: [{ source: { contains: "import" } }, { source: { contains: "raklet" } }],
        },
      }),
    ]);
    console.log(`OK data: contacts=${contacts} importedLike=${imported} publishedEvents=${publishedEvents}`);
    if (contacts < 1) {
      console.warn("WARN contacts: run npm run import:nb-crm or dashboard import");
    }
    if (publishedEvents === 0) {
      console.warn("WARN events: publish at least one event for Part B sign-off");
    }
  }

  const checks = [
    [`${baseUrl}/portal/${SLUG}`, "portal home"],
    [`${baseUrl}/portal/${SLUG}/events`, "portal events"],
    [`${baseUrl}/portal/${SLUG}/contact?interest=newsletter`, "newsletter interest"],
    [`${baseUrl}/portal/${SLUG}/contact?interest=investment-analysis`, "investment interest"],
    [`${baseUrl}/portal/${SLUG}/join`, "membership join"],
    [`${baseUrl}/portal/${SLUG}/donate`, "donations"],
    [`${baseUrl}/api/embed/events?tenantSlug=${SLUG}&maxItems=3`, "embed events API"],
  ] as const;

  for (const [url, label] of checks) {
    const ok = await checkHttp(url, label);
    if (!ok) failed = true;
  }

  if (failed) {
    throw new Error("NB integration verification failed");
  }
  console.log("NB integration verification: all checks passed");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
